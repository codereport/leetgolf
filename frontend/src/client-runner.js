/**
 * Client-side code execution for languages with WASM/JS interpreters.
 * Used when the backend server doesn't have the language installed.
 */

// ============================================================================
// TinyAPL (WASM via iframe)
// ============================================================================
let tinyaplIframe = null;
let tinyaplReady = false;
let tinyaplLoadError = null;
let tinyaplLoading = null;

async function loadTinyapl() {
  if (tinyaplReady) return true;
  if (tinyaplLoadError) return false;
  if (tinyaplLoading) return tinyaplLoading;

  tinyaplLoading = new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';

    const timeout = setTimeout(() => {
      tinyaplLoadError = new Error('TinyAPL WASM loading timed out (12MB download)');
      reject(tinyaplLoadError);
    }, 120000);

    const poll = setInterval(() => {
      try {
        if (iframe.contentWindow?._tinyaplReady) {
          clearTimeout(timeout);
          clearInterval(poll);
          tinyaplIframe = iframe;
          tinyaplReady = true;
          resolve(true);
        } else if (iframe.contentWindow?._tinyaplError) {
          clearTimeout(timeout);
          clearInterval(poll);
          tinyaplLoadError = iframe.contentWindow._tinyaplError;
          reject(tinyaplLoadError);
        }
      } catch (e) {
        // cross-origin or not ready yet, keep polling
      }
    }, 200);

    iframe.onerror = function () {
      clearTimeout(timeout);
      clearInterval(poll);
      tinyaplLoadError = new Error('Failed to load TinyAPL loader');
      reject(tinyaplLoadError);
    };

    iframe.src = '/vendor/array-box/wasm/tinyapl/tinyapl-loader.html';
    document.body.appendChild(iframe);
  });

  try {
    return await tinyaplLoading;
  } catch {
    return false;
  }
}

async function evalTinyapl(code) {
  if (!tinyaplReady) {
    const loaded = await loadTinyapl();
    if (!loaded) {
      return {
        success: false,
        output: `TinyAPL failed to load: ${tinyaplLoadError?.message || 'Unknown error'}\n\nThe WASM file is ~12MB and may take a moment to download.`
      };
    }
  }

  try {
    return await tinyaplIframe.contentWindow._tinyaplEval(code);
  } catch (err) {
    return { success: false, output: `TinyAPL error: ${err.message || String(err)}` };
  }
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

    iframe.src = '/vendor/array-box/wasm/kap/kap-loader.html';
    document.body.appendChild(iframe);
  });

  try {
    return await kapLoading;
  } catch {
    return false;
  }
}

/**
 * Parse Kap's boxed output format to extract clean values.
 * Kap wraps results in box-drawing characters:
 *   ┌→────┐
 *   │1 2 3│
 *   └─────┘
 * This extracts the content between │ delimiters.
 */
function parseKapBoxedOutput(raw) {
  if (!raw.includes('│')) return raw;

  const matches = raw.match(/│([^│]*)│/g);
  if (!matches) return raw;

  return matches
    .map(m => m.slice(1, -1).trim())
    .filter(s => s && !/^[┌┐└┘─→↓]+$/.test(s))
    .join('\n');
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
    const output = parseKapBoxedOutput(rawOutput);
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
 * Run test cases client-side, wrapping code as a tacit function applied to input.
 * Matches backend runner.js wrapping: (code) input  or  leftArg (code) input
 */
export async function runClientTests(language, code, testCases) {
  const results = [];

  for (const test of testCases) {
    let expr;
    if (test.leftArg) {
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
