/**
 * Code Runner - Executes array language code against test cases
 * 
 * Supports:
 * - BQN: via bqn.js (Node.js)
 * - Uiua: via uiua binary (local)
 * - J: via jconsole (local)
 * - APL: via dyalog (local)
 */

import { spawn, execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Execution timeout in ms
const EXEC_TIMEOUT = 10000;

// Strip ANSI escape codes from output
function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b\[\?[0-9;]*[a-zA-Z]/g, '');
}

// ============================================================================
// BQN Runner (using bqn.js)
// ============================================================================
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let bqnEngine = null;
let bqnFmt = null;

async function initBQN() {
  if (bqnEngine) return;
  
  // Load bqn.cjs as a CommonJS module
  const bqnPath = join(__dirname, 'vendor', 'bqn.cjs');
  const bqn = require(bqnPath);
  
  bqnEngine = bqn;
  bqnFmt = bqn.fmt;
}

async function runBQN(code, input, leftArg = null) {
  await initBQN();
  
  try {
    // Wrap code as a function applied to input
    // For dyadic: leftArg {𝕨 code 𝕩} input
    // For monadic: {code 𝕩} input
    let expr;
    if (leftArg !== null) {
      expr = `${leftArg} {𝕨 ${code} 𝕩} ${input}`;
    } else {
      expr = `{${code} 𝕩} ${input}`;
    }
    const result = bqnEngine(expr);
    const formatted = bqnFmt(result);
    return { success: true, output: formatted };
  } catch (e) {
    return { success: false, output: e.message || String(e) };
  }
}

// ============================================================================
// Uiua Runner (using uiua binary)
// ============================================================================
function findUiuaExecutable() {
  const candidates = [
    'uiua',
    '/usr/local/bin/uiua',
    '/usr/bin/uiua',
    join(process.env.HOME || '', '.cargo', 'bin', 'uiua'),
  ];
  
  for (const cmd of candidates) {
    try {
      execSync(`"${cmd}" --version`, { timeout: 2000, stdio: 'ignore' });
      return cmd;
    } catch (e) {
      // Try next
    }
  }
  return null;
}

let uiuaExecutable = null;

async function runUiua(code, input, leftArg = null) {
  if (!uiuaExecutable) {
    uiuaExecutable = findUiuaExecutable();
  }
  
  if (!uiuaExecutable) {
    return { success: false, output: 'Uiua interpreter not found on server' };
  }
  
  return new Promise((resolve) => {
    // Create temp file with code
    // The function receives input on the stack
    // For Uiua, leftArg is not used separately - input contains all stack values
    const fullCode = `${input}\n${code}`;
    const tmpFile = join(tmpdir(), `uiua_${Date.now()}.ua`);
    
    try {
      writeFileSync(tmpFile, fullCode);
      
      const proc = spawn(uiuaExecutable, ['run', tmpFile], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: EXEC_TIMEOUT,
        env: { ...process.env, TERM: 'dumb', NO_COLOR: '1' },
      });
      
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      
      const timeout = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        resolve({ success: false, output: 'Execution timed out' });
      }, EXEC_TIMEOUT);
      
      proc.on('close', (exitCode) => {
        clearTimeout(timeout);
        try { unlinkSync(tmpFile); } catch (e) {}
        
        if (timedOut) return;
        
        // Uiua outputs to stderr, not stdout - this is normal behavior
        // Check exit code to determine success
        // Strip ANSI escape codes that Uiua may emit
        const output = stripAnsi((stdout + stderr).trim());
        
        // If exit code is 0, it's success regardless of which stream has output
        if (exitCode === 0) {
          resolve({ success: true, output });
        } else {
          resolve({ success: false, output });
        }
      });
      
      proc.on('error', (err) => {
        clearTimeout(timeout);
        try { unlinkSync(tmpFile); } catch (e) {}
        if (!timedOut) {
          resolve({ success: false, output: err.message });
        }
      });
    } catch (e) {
      try { unlinkSync(tmpFile); } catch (e2) {}
      resolve({ success: false, output: e.message });
    }
  });
}

// ============================================================================
// J Runner (using jconsole)
// ============================================================================
function findJExecutable() {
  const candidates = [
    'ijconsole',
    'jconsole',
    'j',
    join(process.env.HOME || '', 'j9.6', 'bin', 'ijconsole'),
    join(process.env.HOME || '', 'j9.6', 'bin', 'jconsole'),
    '/usr/local/bin/jconsole',
    '/usr/bin/jconsole',
  ];
  
  for (const cmd of candidates) {
    try {
      execSync(`"${cmd}" -js -e "exit 0"`, {
        timeout: 2000,
        stdio: 'ignore',
        env: { ...process.env, DISPLAY: '' }
      });
      return cmd;
    } catch (e) {
      // Try next
    }
  }
  return null;
}

let jExecutable = null;

async function runJ(code, input, leftArg = null) {
  if (!jExecutable) {
    jExecutable = findJExecutable();
  }
  
  if (!jExecutable) {
    return { success: false, output: 'J interpreter not found on server' };
  }
  
  return new Promise((resolve) => {
    // In J, apply the tacit function to the input
    // For dyadic: leftArg (code) input
    // For monadic: (code) input
    let fullCode;
    if (leftArg !== null) {
      fullCode = `${leftArg} (${code}) ${input}\nexit 0\n`;
    } else {
      fullCode = `(${code}) ${input}\nexit 0\n`;
    }
    
    const proc = spawn(jExecutable, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DISPLAY: '', TERM: 'dumb' }
    });
    
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      resolve({ success: false, output: 'Execution timed out' });
    }, EXEC_TIMEOUT);
    
    proc.on('close', (exitCode) => {
      clearTimeout(timeout);
      if (timedOut) return;
      
      // Clean up J's REPL output
      let output = stdout.trim();
      output = output.replace(/\s*exit 0\s*$/, '').trim();
      
      if (stderr.trim()) {
        resolve({ success: false, output: stderr.trim() });
      } else {
        resolve({ success: true, output });
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      if (!timedOut) {
        resolve({ success: false, output: err.message });
      }
    });
    
    proc.stdin.write(fullCode);
    proc.stdin.end();
  });
}

// ============================================================================
// APL Runner (using Dyalog)
// ============================================================================
function findAPLExecutable() {
  const candidates = [
    'dyalog',
    '/opt/mdyalog/20.0/64/unicode/mapl',
    join(process.env.HOME || '', 'dyalog', 'mapl'),
  ];
  
  for (const cmd of candidates) {
    try {
      execSync(`echo "⎕OFF" | "${cmd}" 2>/dev/null`, { timeout: 3000, stdio: 'ignore' });
      return cmd;
    } catch (e) {
      // Try next
    }
  }
  return null;
}

let aplExecutable = null;

async function runAPL(code, input, leftArg = null) {
  if (!aplExecutable) {
    aplExecutable = findAPLExecutable();
  }
  
  if (!aplExecutable) {
    return { success: false, output: 'Dyalog APL interpreter not found on server' };
  }
  
  return new Promise((resolve) => {
    // APL: apply the dfn/tacit function to the input
    // Escape single quotes
    const escapedCode = code.replace(/'/g, "''");
    const escapedInput = input.replace(/'/g, "''");
    
    // For dyadic: leftArg (code) input
    // For monadic: (code) input
    let aplInput;
    if (leftArg !== null) {
      const escapedLeftArg = leftArg.replace(/'/g, "''");
      aplInput = `]boxing on -s=min\n⎕←${escapedLeftArg} (${escapedCode}) ${escapedInput}\n`;
    } else {
      aplInput = `]boxing on -s=min\n⎕←(${escapedCode}) ${escapedInput}\n`;
    }
    
    const proc = spawn(aplExecutable, ['-b'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DYALOG_NOPOPUPS: '1' }
    });
    
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      resolve({ success: false, output: 'Execution timed out' });
    }, EXEC_TIMEOUT);
    
    proc.on('close', (exitCode) => {
      clearTimeout(timeout);
      if (timedOut) return;
      
      // Filter out Dyalog noise
      const cleanError = stderr
        .split('\n')
        .filter(line => {
          const t = line.trim();
          if (!t) return false;
          if (t.includes('ERR: Display.cpp')) return false;
          if (t.includes('ANGLE')) return false;
          if (t.includes('glX')) return false;
          if (t.includes('⎕←')) return false;
          if (t.includes(']boxing')) return false;
          return true;
        })
        .join('\n')
        .trim();
      
      if (cleanError) {
        resolve({ success: false, output: cleanError });
      } else {
        const cleanOutput = stdout
          .split('\n')
          .filter(line => {
            const t = line.trim();
            if (t.startsWith('Was ')) return false;
            if (t.match(/^Was (ON|OFF)/)) return false;
            if (t.includes('-style=')) return false;
            if (t.startsWith('*')) return false;
            return true;
          })
          .join('\n')
          .trim();
        resolve({ success: true, output: cleanOutput });
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      if (!timedOut) {
        resolve({ success: false, output: err.message });
      }
    });
    
    proc.stdin.write(aplInput);
    proc.stdin.end();
  });
}

// ============================================================================
// Main Runner Interface
// ============================================================================
const runners = {
  bqn: runBQN,
  uiua: runUiua,
  j: runJ,
  apl: runAPL,
};

/**
 * Run code for a single test case
 * @param {string} language - 'bqn', 'uiua', 'j', or 'apl'
 * @param {string} code - The user's solution code
 * @param {string} input - Test input (right argument)
 * @param {string|null} leftArg - Optional left argument for dyadic functions
 * @returns {Promise<{success: boolean, output: string}>}
 */
export async function runCode(language, code, input, leftArg = null) {
  const runner = runners[language];
  if (!runner) {
    return { success: false, output: `Unknown language: ${language}` };
  }
  
  return runner(code, input, leftArg);
}

/**
 * Run code against multiple test cases
 * @param {string} language - 'bqn', 'uiua', 'j', or 'apl'
 * @param {string} code - The user's solution code  
 * @param {Array<{input: string, expected: string, leftArg?: string}>} testCases - Test cases to run
 * @returns {Promise<Array<{input: string, expected: string, actual: string, passed: boolean}>>}
 */
export async function runTests(language, code, testCases) {
  const results = [];
  
  for (const test of testCases) {
    const { success, output } = await runCode(language, code, test.input, test.leftArg || null);
    
    // Normalize output for comparison (trim whitespace)
    const actual = output.trim();
    const expected = test.expected.trim();
    const passed = success && actual === expected;
    
    results.push({
      input: test.leftArg ? `${test.leftArg} f ${test.input}` : `f ${test.input}`,
      expected: test.expected,
      actual: output,
      passed,
    });
  }
  
  return results;
}

/**
 * Check which language runners are available on this server
 */
export function getAvailableLanguages() {
  return {
    bqn: true, // Always available (JavaScript)
    uiua: !!findUiuaExecutable(),
    j: !!findJExecutable(),
    apl: !!findAPLExecutable(),
  };
}

/**
 * Format Uiua code (convert ASCII names to Unicode symbols)
 * @param {string} code - Uiua code to format
 * @returns {Promise<{success: boolean, formatted: string}>}
 */
export async function formatUiuaCode(code) {
  if (!uiuaExecutable) {
    uiuaExecutable = findUiuaExecutable();
  }
  
  if (!uiuaExecutable) {
    return { success: false, formatted: code };
  }
  
  return new Promise((resolve) => {
    const tmpFile = join(tmpdir(), `uiua_fmt_${Date.now()}.ua`);
    
    try {
      writeFileSync(tmpFile, code);
      
      const proc = spawn(uiuaExecutable, ['fmt', tmpFile], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000,
        env: { ...process.env, TERM: 'dumb', NO_COLOR: '1' },
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      
      proc.on('close', (exitCode) => {
        // Read the formatted file
        try {
          const formatted = readFileSync(tmpFile, 'utf-8');
          unlinkSync(tmpFile);
          resolve({ success: true, formatted: formatted.trim() });
        } catch (e) {
          try { unlinkSync(tmpFile); } catch (e2) {}
          resolve({ success: false, formatted: code });
        }
      });
      
      proc.on('error', () => {
        try { unlinkSync(tmpFile); } catch (e) {}
        resolve({ success: false, formatted: code });
      });
    } catch (e) {
      try { unlinkSync(tmpFile); } catch (e2) {}
      resolve({ success: false, formatted: code });
    }
  });
}
