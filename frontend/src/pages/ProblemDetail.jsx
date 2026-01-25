import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProblem } from '../api';
import ProblemSolver from '../components/ProblemSolver';

// Hardcoded starter problems (will be replaced by backend later)
// Each language has its own expected output format
const STARTER_PROBLEMS = {
  'iota': {
    title: 'Iota',
    slug: 'iota',
    description: 'Given a positive integer n, return an array containing the integers from 1 to n.',
    isStarter: true,
    // Test cases per language - each language has different output format
    testCasesByLanguage: {
      bqn: [
        { input: '3', expected: '⟨ 1 2 3 ⟩' },
        { input: '5', expected: '⟨ 1 2 3 4 5 ⟩' },
        { input: '1', expected: '⟨ 1 ⟩' },
        { input: '10', expected: '⟨ 1 2 3 4 5 6 7 8 9 10 ⟩' },
        { input: '7', expected: '⟨ 1 2 3 4 5 6 7 ⟩' },
      ],
      apl: [
        { input: '3', expected: '1 2 3' },
        { input: '5', expected: '1 2 3 4 5' },
        { input: '1', expected: '1' },
        { input: '10', expected: '1 2 3 4 5 6 7 8 9 10' },
        { input: '7', expected: '1 2 3 4 5 6 7' },
      ],
      j: [
        { input: '3', expected: '1 2 3' },
        { input: '5', expected: '1 2 3 4 5' },
        { input: '1', expected: '1' },
        { input: '10', expected: '1 2 3 4 5 6 7 8 9 10' },
        { input: '7', expected: '1 2 3 4 5 6 7' },
      ],
      uiua: [
        { input: '3', expected: '[1 2 3]' },
        { input: '5', expected: '[1 2 3 4 5]' },
        { input: '1', expected: '[1]' },
        { input: '10', expected: '[1 2 3 4 5 6 7 8 9 10]' },
        { input: '7', expected: '[1 2 3 4 5 6 7]' },
      ],
    },
    optimalLength: {
      bqn: 3,  // "1+↕"
      apl: 3,  // "⍳⊢" or "⎕io←1"
      j: 5,    // ">:i."
      uiua: 4, // "+1⇡"
    },
  }
};

export default function ProblemDetail() {
  const { slug } = useParams();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Check if it's a hardcoded starter problem first
    if (STARTER_PROBLEMS[slug]) {
      setProblem(STARTER_PROBLEMS[slug]);
      setLoading(false);
      return;
    }

    // Otherwise fetch from backend
    fetchProblem(slug)
      .then((data) => {
        if (!isMounted) return;
        const p = data.problem;
        // Backend returns test cases per language
        const testCasesByLanguage = data.test_cases_by_language || {};
        setProblem({
          ...p,
          isStarter: p.is_starter,
          testCasesByLanguage,
        });
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-gray-900 pt-20 px-8 pb-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/problems" className="text-green-400 hover:text-green-300 text-sm">
          ← Back to Problems
        </Link>

        {loading && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-gray-300 mt-6">
            Loading problem...
          </div>
        )}

        {!loading && error && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-red-300 mt-6">
            Failed to load problem.
          </div>
        )}

        {!loading && !error && problem && (
          <div className="mt-6 space-y-6">
            {/* Problem Title and Description */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-white">{problem.title}</h1>
                {problem.isStarter && (
                  <span className="text-xs uppercase tracking-wide bg-green-600 text-white px-2 py-1 rounded-full">
                    Starter
                  </span>
                )}
              </div>
              <p className="text-gray-300 text-lg">{problem.description}</p>
            </div>

            {/* Code Editor (array-box style) */}
            <ProblemSolver problem={problem} />
          </div>
        )}
      </div>
    </div>
  );
}
