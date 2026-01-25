import React, { useState, useEffect, useRef } from 'react';
import { createKeyboardHandler } from '../vendor/array-box/src/keymap.js';
import { highlightCode } from '../vendor/array-box/src/syntax.js';

// Language configuration
const LANGUAGES = {
  bqn: {
    name: 'BQN',
    logo: '/logos/bqn.svg',
    fontClass: 'font-bqn',
    hasKeymap: true,
  },
  apl: {
    name: 'APL',
    logo: '/logos/apl.png',
    fontClass: 'font-apl',
    hasKeymap: true,
  },
  j: {
    name: 'J',
    logo: '/logos/j_logo.png',
    fontClass: 'font-j',
    hasKeymap: false,
  },
  uiua: {
    name: 'Uiua',
    logo: '/logos/uiua.png',
    fontClass: 'font-uiua',
    hasKeymap: false,
  },
};

const LANGUAGE_ORDER = ['bqn', 'apl', 'j', 'uiua'];

export default function ProblemSolver({ problem }) {
  const [language, setLanguage] = useState('bqn');
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmission, setIsSubmission] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const langConfig = LANGUAGES[language];

  // Set up keyboard handler for array language input
  useEffect(() => {
    if (inputRef.current && langConfig.hasKeymap) {
      const cleanup = createKeyboardHandler(inputRef.current, language);
      return cleanup;
    }
  }, [language, langConfig.hasKeymap]);

  // Sync input value with state (needed because keyboard handler modifies DOM directly)
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = () => {
      setCode(input.value);
    };

    input.addEventListener('input', handleInput);
    return () => input.removeEventListener('input', handleInput);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Up/Down to switch languages
      if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const currentIndex = LANGUAGE_ORDER.indexOf(language);
        let newIndex;
        if (e.key === 'ArrowUp') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : LANGUAGE_ORDER.length - 1;
        } else {
          newIndex = currentIndex < LANGUAGE_ORDER.length - 1 ? currentIndex + 1 : 0;
        }
        setLanguage(LANGUAGE_ORDER[newIndex]);
        setResults(null); // Clear results when switching
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [language]);

  const switchLanguage = (lang) => {
    setLanguage(lang);
    setDropdownOpen(false);
    setResults(null);
    setIsSubmission(false);
    setCode('');
    // Clear and focus the input after switching
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const runTests = (fullSuite = false) => {
    // Currently only BQN is implemented
    if (language !== 'bqn') {
      setResults([{ input: '', expected: '', actual: `${langConfig.name} execution not yet implemented`, passed: false }]);
      return;
    }

    if (!window.bqn || !window.fmt) {
      setResults([{ input: '', expected: '', actual: 'Error: BQN engine not loaded', passed: false }]);
      return;
    }

    setIsRunning(true);

    try {
      // Run only first 2 tests for "Run Tests", all tests for "Submit"
      const testsToRun = fullSuite 
        ? (problem?.testCases || [])
        : (problem?.testCases?.slice(0, 2) || []);

      if (testsToRun.length > 0) {
        const newResults = testsToRun.map(test => {
          try {
            // Run the code applied to the input
            // Use braces to wrap as a function block if needed
            const runExpr = `{${code} 𝕩} ${test.input}`;
            const testRes = window.bqn(runExpr);
            const formatted = window.fmt(testRes);
            const passed = formatted === test.expected;
            return { ...test, actual: formatted, passed };
          } catch (e) {
            return { ...test, actual: e.message, passed: false };
          }
        });
        setResults(newResults);
        setIsSubmission(fullSuite);
      }
    } catch (e) {
      setResults([{ input: '', expected: '', actual: 'Error: ' + e.message, passed: false }]);
    } finally {
      setIsRunning(false);
    }
  };

  // Handle Ctrl+Enter to run tests, Ctrl+Shift+Enter to submit
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        runTests(true); // Submit - full test suite
      } else {
        runTests(false); // Run Tests - sample tests only
      }
    }
  };

  const codeLength = code.length;
  const allPassed = results && results.length > 0 && results.every(r => r.passed);
  const totalTests = problem?.testCases?.length || 0;

  return (
    <div className="space-y-4">
      {/* Array-box style input */}
      <div className="flex items-center gap-3">
        {/* Language selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen(!dropdownOpen);
            }}
            className="bg-transparent border-none p-3 cursor-pointer flex items-center hover:opacity-80 transition-opacity"
            title={`${langConfig.name} (Ctrl+↑/↓ to switch)`}
          >
            <img
              src={langConfig.logo}
              alt={langConfig.name}
              className="w-12 h-12 object-contain"
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-lg z-50 min-w-[140px]">
              {LANGUAGE_ORDER.map((lang) => (
                <button
                  key={lang}
                  onClick={() => switchLanguage(lang)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    lang === language ? 'bg-gray-700' : ''
                  }`}
                >
                  <img
                    src={LANGUAGES[lang].logo}
                    alt={LANGUAGES[lang].name}
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-gray-200">{LANGUAGES[lang].name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Code input with syntax highlighting */}
        <div className="flex-1 relative bg-gray-800 rounded-lg border-2 border-gray-600 focus-within:border-green-500 transition-colors">
          {/* Syntax highlighting layer */}
          <div
            className={`px-5 py-4 whitespace-pre ${langConfig.fontClass}`}
            style={{
              fontSize: '24px',
              lineHeight: '1.5',
              minHeight: '56px',
            }}
            dangerouslySetInnerHTML={{ __html: highlightCode(code, language) || '<span class="text-gray-500">Type code...</span>' }}
          />
          {/* Actual input (invisible, captures input) */}
          <input
            ref={inputRef}
            type="text"
            defaultValue=""
            onKeyDown={handleKeyDown}
            className={`absolute inset-0 w-full h-full px-5 py-4 bg-transparent border-none outline-none ${langConfig.fontClass}`}
            style={{
              fontSize: '24px',
              lineHeight: '1.5',
              caretColor: '#10b981',
              color: 'transparent',
            }}
            spellCheck={false}
            autoFocus
          />
        </div>
      </div>

      {/* Character count and buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => runTests(false)}
            disabled={isRunning || !code.trim()}
            className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {isRunning && !isSubmission ? 'Running...' : 'Run Tests'}
          </button>
          <button
            onClick={() => runTests(true)}
            disabled={isRunning || !code.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {isRunning && isSubmission ? 'Submitting...' : 'Submit'}
          </button>
          <span className="text-gray-500 text-xs hidden sm:inline">
            Ctrl+Enter test · Ctrl+Shift+Enter submit
          </span>
        </div>
        <div className={`text-lg ${allPassed && isSubmission ? 'text-green-400' : 'text-gray-400'}`}>
          <span className="font-mono font-bold text-2xl">{codeLength}</span>
          <span className="text-sm ml-1">char{codeLength !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Test Results */}
      {results && (
        <div className="space-y-2 mt-4">
          {/* Header showing test mode */}
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {isSubmission ? `Submission (${results.length}/${totalTests} tests)` : 'Sample Tests'}
          </div>

          {results.map((res, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border ${
                res.passed
                  ? 'bg-green-900/20 border-green-700/50'
                  : 'bg-red-900/20 border-red-700/50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`font-mono ${langConfig.fontClass}`}>
                  <span className="text-gray-500 text-sm">f </span>
                  <span className="text-gray-300">{res.input}</span>
                  <span className="text-gray-500 mx-2">→</span>
                  <span className={res.passed ? 'text-green-300' : 'text-red-300'}>
                    {res.actual}
                  </span>
                </div>
                <span className={`text-sm font-medium ${res.passed ? 'text-green-400' : 'text-red-400'}`}>
                  {res.passed ? '✓' : '✗'}
                </span>
              </div>
              {!res.passed && (
                <div className={`mt-2 text-sm font-mono ${langConfig.fontClass} text-gray-400`}>
                  expected: {res.expected}
                </div>
              )}
            </div>
          ))}

          {/* Success message */}
          {allPassed && isSubmission && (
            <div className="p-4 rounded-lg bg-green-900/30 border border-green-600 text-center">
              <span className="text-green-400 font-medium">
                All tests passed! Your score: <span className="font-mono font-bold text-xl">{codeLength}</span> chars
              </span>
              {problem.optimalLength && codeLength > problem.optimalLength && (
                <div className="text-green-300/60 text-sm mt-1">
                  Optimal solution is {problem.optimalLength} char{problem.optimalLength !== 1 ? 's' : ''}
                </div>
              )}
              {problem.optimalLength && codeLength === problem.optimalLength && (
                <div className="text-yellow-400 text-sm mt-1">
                  Perfect! You found the optimal solution!
                </div>
              )}
            </div>
          )}

          {/* Prompt to submit if sample tests pass */}
          {allPassed && !isSubmission && (
            <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/50 text-center text-sm text-blue-300">
              Sample tests passed! Click <strong>Submit</strong> to run the full test suite.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
