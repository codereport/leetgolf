import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createKeyboardHandler, insertText, bqnKeymap, aplKeymap, kapKeymap, tinyaplKeymap, tinyaplKeyboard, uiuaGlyphs, jGlyphs } from '../vendor/array-box/src/keymap.js';
import { highlightCode, syntaxRules } from '../vendor/array-box/src/syntax.js';
import { ArrayKeyboard, bqnGlyphNames, aplGlyphNames, kapGlyphNames, tinyaplGlyphNames, jGlyphNames, uiuaGlyphNames, bqnGlyphDocs, aplGlyphDocs, kapGlyphDocs, tinyaplGlyphDocs, jGlyphDocs, uiuaGlyphDocs } from '../vendor/array-box/src/keyboard.js';
import { runTests as runTestsAPI, fetchAvailableLanguages, formatUiua, submitSolution, checkSolved } from '../api.js';
import { hasClientRunner, runClientTests } from '../client-runner.js';

// Language configuration
const LANGUAGES = {
  bqn: {
    name: 'BQN',
    logo: '/logos/bqn.svg',
    fontClass: 'font-bqn',
    hasKeymap: true,
    keymapLang: 'bqn',
  },
  apl: {
    name: 'APL',
    logo: '/logos/apl.png',
    fontClass: 'font-apl',
    hasKeymap: true,
    keymapLang: 'apl',
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
  kap: {
    name: 'Kap',
    logo: '/logos/kap.png',
    fontClass: 'font-kap',
    hasKeymap: true,
    keymapLang: 'kap',
  },
  tinyapl: {
    name: 'TinyAPL',
    logo: '/logos/tinyapl.svg',
    fontClass: 'font-tinyapl',
    hasKeymap: true,
    keymapLang: 'tinyapl',
  },
};

const LANGUAGE_ORDER = ['bqn', 'apl', 'j', 'uiua', 'kap', 'tinyapl'];

const KEYBOARD_CONFIGS = {
  bqn: {
    keymap: bqnKeymap,
    language: 'BQN',
    prefixKey: '\\',
    fontFamily: "'BQN', 'Courier New', monospace",
    syntaxRules: syntaxRules.bqn,
    displayMode: 'keyboard',
    glyphNames: bqnGlyphNames,
    glyphDocs: bqnGlyphDocs,
    logoPath: '/logos/bqn.svg',
  },
  apl: {
    keymap: aplKeymap,
    language: 'APL',
    prefixKey: '`',
    fontFamily: "'APL', 'Courier New', monospace",
    syntaxRules: syntaxRules.apl,
    displayMode: 'keyboard',
    glyphNames: aplGlyphNames,
    glyphDocs: aplGlyphDocs,
    logoPath: '/logos/apl.png',
  },
  j: {
    language: 'J',
    fontFamily: "'JetBrains Mono', monospace",
    syntaxRules: syntaxRules.j,
    displayMode: 'category',
    compactCategories: true,
    categoryTitle: 'J Primitives',
    glyphNames: jGlyphNames,
    glyphDocs: jGlyphDocs,
    logoPath: '/logos/j_logo.png',
    glyphCategories: {
      functions: { glyphs: jGlyphs.functions, label: 'Verbs', syntaxClass: 'syntax-function' },
      verbDigraphs: { glyphs: jGlyphs.verbDigraphs, label: 'Verbs', syntaxClass: 'syntax-function' },
      monadic: { glyphs: jGlyphs.monadic, label: 'Adverbs', syntaxClass: 'syntax-modifier-monadic' },
      adverbDigraphs: { glyphs: jGlyphs.adverbDigraphs, label: 'Adverbs', syntaxClass: 'syntax-modifier-monadic' },
      dyadic: { glyphs: jGlyphs.dyadic, label: 'Conjunctions', syntaxClass: 'syntax-modifier-dyadic' },
      conjunctionDigraphs: { glyphs: jGlyphs.conjunctionDigraphs, label: 'Conjunctions', syntaxClass: 'syntax-modifier-dyadic' },
      constants: { glyphs: jGlyphs.constants, label: 'Constants', syntaxClass: 'syntax-number' },
      comments: { glyphs: jGlyphs.comments, label: 'Comments', syntaxClass: 'syntax-comment' },
    },
  },
  uiua: {
    language: 'Uiua',
    fontFamily: "'Uiua', 'Courier New', monospace",
    syntaxRules: syntaxRules.uiua,
    displayMode: 'category',
    compactCategories: true,
    glyphNames: uiuaGlyphNames,
    glyphDocs: uiuaGlyphDocs,
    logoPath: '/logos/uiua.png',
    glyphCategories: {
      stack: { glyphs: uiuaGlyphs.stack, label: 'Stack', syntaxClass: 'syntax-stack' },
      monadicPervasive: { glyphs: uiuaGlyphs.monadicPervasive, label: 'Monadic Functions', syntaxClass: 'syntax-uiua-function-monadic' },
      monadicArray: { glyphs: uiuaGlyphs.monadicArray, label: 'Monadic Functions', syntaxClass: 'syntax-uiua-function-monadic', isArray: true },
      dyadicPervasive: { glyphs: uiuaGlyphs.dyadicPervasive, label: 'Dyadic Functions', syntaxClass: 'syntax-uiua-function-dyadic' },
      dyadicArray: { glyphs: uiuaGlyphs.dyadicArray, label: 'Dyadic Functions', syntaxClass: 'syntax-uiua-function-dyadic', isArray: true },
      monadicModifiers: { glyphs: uiuaGlyphs.monadicModifiers, label: '1-Modifiers', syntaxClass: 'syntax-uiua-modifier-monadic' },
      dyadicModifiers: { glyphs: uiuaGlyphs.dyadicModifiers, label: '2-Modifiers', syntaxClass: 'syntax-uiua-modifier-dyadic' },
      constants: { glyphs: uiuaGlyphs.constants, label: 'Constants', syntaxClass: 'syntax-number' },
    },
  },
  kap: {
    keymap: kapKeymap,
    language: 'Kap',
    prefixKey: '`',
    fontFamily: "'APL', 'Courier New', monospace",
    syntaxRules: syntaxRules.kap,
    displayMode: 'keyboard',
    glyphNames: kapGlyphNames,
    glyphDocs: kapGlyphDocs,
    logoPath: '/logos/kap.png',
  },
  tinyapl: {
    keymap: tinyaplKeymap,
    language: 'TinyAPL',
    prefixKey: '`',
    fontFamily: "'TinyAPL', 'Courier New', monospace",
    syntaxRules: syntaxRules.tinyapl,
    displayMode: 'tinyapl',
    tinyaplKeyboard: tinyaplKeyboard,
    glyphNames: tinyaplGlyphNames,
    glyphDocs: tinyaplGlyphDocs,
    logoPath: '/logos/tinyapl.svg',
  },
};

export default function ProblemSolver({ problem }) {
  const [language, setLanguage] = useState('bqn');
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmission, setIsSubmission] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState({ bqn: true, uiua: false, j: false, apl: false, kap: false, tinyapl: false });
  const [hasSolved, setHasSolved] = useState(false);
  const [submissionSaved, setSubmissionSaved] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const keyboardRef = useRef(null);

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
      // Use keymapLang if specified (e.g., Kap uses APL keymap)
      const keymapLang = langConfig.keymapLang || language;
      const cleanup = createKeyboardHandler(inputRef.current, keymapLang);
      return cleanup;
    }
  }, [language, langConfig.hasKeymap, langConfig.keymapLang]);

  // Visual keyboard overlay (ArrayKeyboard from array-box)
  useEffect(() => {
    const config = KEYBOARD_CONFIGS[language];
    if (!config) return;

    if (keyboardRef.current) {
      keyboardRef.current.destroy();
      keyboardRef.current = null;
    }

    keyboardRef.current = new ArrayKeyboard({
      ...config,
      onGlyphClick: (glyph) => {
        if (inputRef.current) {
          inputRef.current.focus();
          insertText(inputRef.current, glyph);
        }
      },
    });

    return () => {
      if (keyboardRef.current) {
        keyboardRef.current.destroy();
        keyboardRef.current = null;
      }
    };
  }, [language]);

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
    const serverAvailable = availableLanguages[language];
    const clientAvailable = hasClientRunner(language);

    if (!serverAvailable && !clientAvailable) {
      setResults([{ 
        input: '', 
        expected: '', 
        actual: `${langConfig.name} is not available. Please ensure the interpreter is installed on the server.`, 
        passed: false 
      }]);
      return;
    }

    setIsRunning(true);
    setIsSubmission(fullSuite);
    setSubmissionSaved(false);

    try {
      let codeToRun = code;
      if (language === 'uiua' && code.trim()) {
        try {
          const formatResult = await formatUiua(code);
          if (formatResult.success && formatResult.formatted !== code) {
            codeToRun = formatResult.formatted;
            if (inputRef.current) {
              inputRef.current.value = formatResult.formatted;
            }
            setCode(formatResult.formatted);
          }
        } catch (e) {
          // Ignore formatting errors, use original code
        }
      }

      const allTestCases = problem?.testCasesByLanguage?.[language] || problem?.testCases || [];
      const testsToRun = fullSuite 
        ? allTestCases
        : allTestCases.slice(0, 2);

      if (testsToRun.length === 0) {
        setResults([{ input: '', expected: '', actual: 'No test cases available for this language', passed: false }]);
        return;
      }

      let response;
      if (serverAvailable) {
        response = await runTestsAPI(language, codeToRun, testsToRun);
      } else {
        response = await runClientTests(language, codeToRun, testsToRun);
      }
      setResults(response.results);
      
      if (fullSuite && response.allPassed) {
        try {
          await submitSolution(problem.slug, language, codeToRun, [...codeToRun].length);
          setHasSolved(true);
          setSubmissionSaved(true);
        } catch (e) {
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

  const codeLength = [...code].length;
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

        {/* Keyboard & Help buttons */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => keyboardRef.current?.toggle()}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded hover:bg-gray-700"
            title="Toggle keyboard overlay (Ctrl+K)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowHelp(h => !h)}
              className="text-gray-400 hover:text-white transition-colors p-1.5 rounded hover:bg-gray-700"
              title="Keyboard shortcuts"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
              </svg>
            </button>
            {showHelp && (
              <div className="absolute left-full top-0 ml-2 bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs text-gray-300 whitespace-nowrap z-50 shadow-lg">
                <div className="font-medium text-white mb-2">Shortcuts</div>
                {langConfig.hasKeymap && (
                  <div className="mb-1">
                    <kbd className="bg-gray-700 px-1 rounded">{langConfig.keymapLang === 'bqn' ? '\\' : '`'}</kbd> + key → glyph
                  </div>
                )}
                <div className="mb-1"><kbd className="bg-gray-700 px-1 rounded">Ctrl+Enter</kbd> Run tests</div>
                <div className="mb-1"><kbd className="bg-gray-700 px-1 rounded">Ctrl+Shift+Enter</kbd> Submit</div>
                <div className="mb-1"><kbd className="bg-gray-700 px-1 rounded">Ctrl+↑/↓</kbd> Switch language</div>
                <div><kbd className="bg-gray-700 px-1 rounded">Ctrl+K</kbd> Keyboard overlay</div>
              </div>
            )}
          </div>
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
              // For submissions with failures, only show the first failure
              (isSubmission && results.some(r => !r.passed) 
                ? [results.find(r => !r.passed)] 
                : results
              ).map((res, i) => (
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
                    {test.leftArg && <span className="text-gray-200">{test.leftArg} </span>}
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
