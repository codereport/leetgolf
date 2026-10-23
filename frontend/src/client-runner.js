/**
 * Client-side code execution for languages with WASM/JS interpreters.
 * Used when the backend server doesn't have the language installed.
 */

// ============================================================================
// WASM interpreters isolated in loader iframes
// ============================================================================
function createIframeRunner(name, loaderFile) {
  let iframe = null;
  let loading = null;

  async function load() {
    if (iframe) return iframe.contentWindow._leetgolfRunner;
    if (loading) return loading;

    loading = new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.style.display = 'none';
      let settled = false;

      const finish = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearInterval(poll);
        if (error) {
          loading = null;
          frame.remove();
          reject(new Error(`${name} failed to load: ${error.message || String(error)}. Please try again.`));
        } else {
          iframe = frame;
          resolve(frame.contentWindow._leetgolfRunner);
        }
      };

      const timeout = setTimeout(() => finish(new Error('Interpreter download timed out')), 120000);
      const poll = setInterval(() => {
        try {
          if (frame.contentWindow?._leetgolfRunner) finish();
          else if (frame.contentWindow?._leetgolfError) finish(frame.contentWindow._leetgolfError);
        } catch (error) {
          finish(error);
        }
      }, 100);

      frame.onerror = () => finish(new Error('Could not open interpreter loader'));
      frame.src = `${import.meta.env.BASE_URL}runners/${loaderFile}`;
      document.body.appendChild(frame);
    });
    return loading;
  }

  return async (code, operation = 'eval') => {
    try {
      const runner = await load();
      return await runner[operation](code);
    } catch (error) {
      return { success: false, output: error.message || String(error) };
    }
  };
}

const evalTinyapl = createIframeRunner('TinyAPL', 'tinyapl-loader.html');
const evalJ = createIframeRunner('J', 'j-loader.html');
const evalUiua = createIframeRunner('Uiua', 'uiua-loader.html');

export async function formatClientUiua(code) {
  const result = await evalUiua(code, 'format');
  return result.success ? { ...result, formatted: result.formatted.trimEnd() } : result;
}

// ============================================================================
// Kap (JavaScript via iframe)
// ============================================================================
let kapEngine = null;
let kapReady = false;
let kapLoadError = null;
let kapLoading = null;

async function loadKap() {
  if (kapReady) return true;
  if (kapLoadError) return false;
  if (kapLoading) return kapLoading;

  kapLoading = new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';

    const timeout = setTimeout(() => {
      kapLoadError = new Error('Kap JS loading timed out');
      reject(kapLoadError);
    }, 60000);

    iframe.onload = function () {
      const kapApi = iframe.contentWindow.standalonejs;
      if (!kapApi) return;

      try {
        const createEngine = kapApi.createEngine;
        if (!createEngine) {
          throw new Error('createEngine not found on Kap module');
        }

        createEngine().then(function (engine) {
          clearTimeout(timeout);
          kapEngine = engine;
          kapReady = true;
          resolve(true);
        }).catch(function (err) {
          clearTimeout(timeout);
          kapLoadError = err;
          reject(err);
        });
      } catch (err) {
        clearTimeout(timeout);
        kapLoadError = err;
        reject(err);
      }
    };

    iframe.onerror = function () {
      clearTimeout(timeout);
      kapLoadError = new Error('Failed to load Kap JS');
      reject(kapLoadError);
    };

    iframe.src = `${import.meta.env.BASE_URL}vendor/array-box/wasm/kap/kap-loader.html`;
    document.body.appendChild(iframe);
  });

  try {
    return await kapLoading;
  } catch {
    return false;
  }
}

/**
 * Remove Kap's display wrappers: angle brackets around vectors and borders
 * around matrices. Quoted strings keep their literal contents.
 */
function parseKapOutput(raw) {
  const text = raw.trim();
  if (text.startsWith('"')) return raw;
  if (text.startsWith('⟨') && text.endsWith('⟩')) return text.slice(1, -1);

  const rows = text.split('\n')
    .map(line => line.trim())
    .filter(line => /^[│↓].*│$/.test(line))
    .map(line => line.slice(1, -1).trim());
  return rows.length ? rows.join('\n') : raw;
}

async function evalKap(code) {
  if (!kapReady) {
    const loaded = await loadKap();
    if (!loaded) {
      return { success: false, output: `Kap failed to load: ${kapLoadError?.message || 'Unknown error'}` };
    }
  }

  try {
    const result = kapEngine.parseAndEvalWithFormat(code);
    const rawOutput = result.text.join('\n');
    const output = parseKapOutput(rawOutput);
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.message || String(err) };
  }
}

// ============================================================================
// Public API
// ============================================================================

const CLIENT_RUNNERS = {
  tinyapl: evalTinyapl,
  kap: evalKap,
  j: evalJ,
  uiua: evalUiua,
};

/**
 * Check if a language has a client-side runner available
 */
export function hasClientRunner(language) {
  return language in CLIENT_RUNNERS;
}

/**
 * Run a single expression client-side
 */
export async function runClientCode(language, code) {
  const runner = CLIENT_RUNNERS[language];
  if (!runner) {
    return { success: false, output: `No client-side runner for ${language}` };
  }
  return runner(code);
}

/**
 * Apply a tacit function to each input, or place Uiua's input on the stack.
 */
export async function runClientTests(language, code, testCases) {
  const results = [];

  for (const test of testCases) {
    let expr;
    if (language === 'uiua') {
      expr = `${test.input}\n${code}`;
    } else if (test.leftArg) {
      expr = `${test.leftArg} (${code}) ${test.input}`;
    } else {
      expr = `(${code}) ${test.input}`;
    }

    const { success, output } = await runClientCode(language, expr);
    const actual = (output || '').trim();
    const expected = test.expected.trim();
    const passed = success && actual === expected;

    results.push({
      input: test.leftArg ? `${test.leftArg} f ${test.input}` : `f ${test.input}`,
      expected: test.expected,
      actual: output,
      passed,
    });
  }

  return {
    results,
    allPassed: results.every(r => r.passed),
    passedCount: results.filter(r => r.passed).length,
    totalCount: results.length,
  };
}
