import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createKeyboardHandler } from '../vendor/array-box/src/keymap.js';
import { highlightCode } from '../vendor/array-box/src/syntax.js';
import { runTests as runTestsAPI, fetchAvailableLanguages, formatUiua, submitSolution, checkSolved } from '../api.js';

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
  const [availableLanguages, setAvailableLanguages] = useState({ bqn: true, uiua: false, j: false, apl: false });
  const [hasSolved, setHasSolved] = useState(false);
  const [submissionSaved, setSubmissionSaved] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const langConfig = LANGUAGES[language];

  // Fetch available languages and check if user has solved this problem
  useEffect(() => {
    fetchAvailableLanguages().then(setAvailableLanguages);
    
    if (problem?.slug) {
      checkSolved(problem.slug).then(result => {
        setHasSolved(result.solved);
      });
    }
  }, [problem?.slug]);

  // Set up keyboard handler for array language input
  useEffect(() => {
    if (inputRef.current && langConfig.hasKeymap) {
      const cleanup = createKeyboardHandler(inputRef.current, language);
      return cleanup;
    }
  }, [language, langConfig.hasKeymap]);

  // Sync input value with state (needed because keyboard handler modifies DOM directly)
  // Also handle Uiua formatting on blur
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = () => {
      setCode(input.value);
    };

    // Format Uiua code when input loses focus
    const handleBlur = async () => {
      if (language === 'uiua' && input.value.trim()) {
        try {
          const result = await formatUiua(input.value);
          if (result.success && result.formatted !== input.value) {
            input.value = result.formatted;
            setCode(result.formatted);
          }
        } catch (e) {
          // Ignore formatting errors
        }
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('blur', handleBlur);
    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('blur', handleBlur);
    };
  }, [language]);

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

  const runTests = async (fullSuite = false) => {
    // Check if language is available on server
    if (!availableLanguages[language]) {
      setResults([{ 
        input: '', 
        expected: '', 
        actual: `${langConfig.name} is not available on the server. Please ensure the interpreter is installed.`, 
        passed: false 
      }]);
      return;
    }

    setIsRunning(true);
    setIsSubmission(fullSuite);
    setSubmissionSaved(false);

    try {
      // Format Uiua code before running
      let codeToRun = code;
      if (language === 'uiua' && code.trim()) {
        try {
          const formatResult = await formatUiua(code);
          if (formatResult.success && formatResult.formatted !== code) {
            codeToRun = formatResult.formatted;
            // Update the input field and state with formatted code
            if (inputRef.current) {
              inputRef.current.value = formatResult.formatted;
            }
            setCode(formatResult.formatted);
          }
        } catch (e) {
          // Ignore formatting errors, use original code
        }
      }

      // Get language-specific test cases
      const allTestCases = problem?.testCasesByLanguage?.[language] || problem?.testCases || [];
      
      // Run only first 2 tests for "Run Tests", all tests for "Submit"
      const testsToRun = fullSuite 
        ? allTestCases
        : allTestCases.slice(0, 2);

      if (testsToRun.length === 0) {
        setResults([{ input: '', expected: '', actual: 'No test cases available for this language', passed: false }]);
        return;
      }

      // Call backend API
      const response = await runTestsAPI(language, codeToRun, testsToRun);
      setResults(response.results);
      
      // If this is a submission and all tests passed, save the solution
      if (fullSuite && response.allPassed) {
        try {
          await submitSolution(problem.slug, language, codeToRun, codeToRun.length);
          setHasSolved(true);
          setSubmissionSaved(true);
        } catch (e) {
          // Silently fail - user might not be logged in
          console.log('Could not save submission:', e.message);
        }
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
  // Get language-specific test cases and optimal length
  const languageTestCases = problem?.testCasesByLanguage?.[language] || problem?.testCases || [];
  const totalTests = languageTestCases.length;
  const optimalLength = typeof problem?.optimalLength === 'object' 
    ? problem.optimalLength[language] 
    : problem?.optimalLength;

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
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-lg z-50 min-w-[160px]">
              {LANGUAGE_ORDER.map((lang) => {
                const isAvailable = availableLanguages[lang];
                return (
                  <button
                    key={lang}
                    onClick={() => switchLanguage(lang)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      lang === language ? 'bg-gray-700' : ''
                    } ${!isAvailable ? 'opacity-50' : ''}`}
                  >
                    <img
                      src={LANGUAGES[lang].logo}
                      alt={LANGUAGES[lang].name}
                      className="w-8 h-8 object-contain"
                    />
                    <span className="text-gray-200">{LANGUAGES[lang].name}</span>
                    {!isAvailable && (
                      <span className="text-xs text-red-400 ml-auto" title="Not installed on server">✗</span>
                    )}
                  </button>
                );
              })}
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
          {/* Show Leaderboard button when user has solved the problem */}
          {hasSolved && (
            <Link
              to={`/problems/${problem.slug}/leaderboard`}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Leaderboard
            </Link>
          )}
        </div>
        <div className={`text-lg ${allPassed && isSubmission ? 'text-green-400' : 'text-gray-400'}`}>
          <span className="font-mono font-bold text-2xl">{codeLength}</span>
          <span className="text-sm ml-1">char{codeLength !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tests Section */}
      <div className="space-y-2 mt-4">
        {/* Success message for submission - don't show individual tests */}
        {results && allPassed && isSubmission ? (
          <div className="p-4 rounded-lg bg-green-900/30 border border-green-600 text-center">
            <span className="text-green-400 font-medium">
              All {totalTests} tests passed! Your score: <span className="font-mono font-bold text-xl">{codeLength}</span> chars
            </span>
            {optimalLength && codeLength > optimalLength && (
              <div className="text-green-300/60 text-sm mt-1">
                Optimal solution is {optimalLength} char{optimalLength !== 1 ? 's' : ''}
              </div>
            )}
            {optimalLength && codeLength === optimalLength && (
              <div className="text-yellow-400 text-sm mt-1">
                Perfect! You found the optimal solution!
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {results && isSubmission 
                ? `Submission (${results.filter(r => r.passed).length}/${totalTests} passed)` 
                : 'Tests'}
            </div>

            {/* Show results if we have them, otherwise show default test cases */}
            {results ? (
              // After running tests - show with pass/fail colors
              results.map((res, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    res.passed
                      ? 'bg-green-900/20 border-green-700/50'
                      : 'bg-red-900/20 border-red-700/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className={`font-mono ${langConfig.fontClass} text-gray-200`}>
                      <span className="text-gray-500 text-sm">f </span>
                      <span className="text-gray-200">{res.input}</span>
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
                      expected: <span className="text-gray-200">{res.expected}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Default view - show first 2 test cases without colors
              languageTestCases.slice(0, 2).map((test, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-gray-700 bg-gray-800"
                >
                  <div className={`font-mono ${langConfig.fontClass} text-gray-200`}>
                    <span className="text-gray-500 text-sm">f </span>
                    <span className="text-gray-200">{test.input}</span>
                    <span className="text-gray-500 mx-2">→</span>
                    <span className="text-green-400">{test.expected}</span>
                  </div>
                </div>
              ))
            )}

            {/* Prompt to submit if sample tests pass */}
            {results && allPassed && !isSubmission && (
              <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/50 text-center text-sm text-blue-300">
                Tests passed! Click <strong>Submit</strong> to run the full test suite.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
