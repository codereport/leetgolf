import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProblem } from '../api';
import ProblemSolver from '../components/ProblemSolver';

// Hardcoded starter problems (will be replaced by backend later)
const STARTER_PROBLEMS = {
  'iota': {
    title: 'Iota',
    slug: 'iota',
    description: 'Given a positive integer n, return an array containing the integers from 1 to n.',
    isStarter: true,
    // Examples shown to user (display format)
    examples: [
      { input: '3', output: '1 2 3' },
      { input: '5', output: '1 2 3 4 5' },
    ],
    // Test cases for execution (BQN format with brackets)
    testCases: [
      { input: '3', expected: '⟨ 1 2 3 ⟩' },
      { input: '5', expected: '⟨ 1 2 3 4 5 ⟩' },
      { input: '1', expected: '⟨ 1 ⟩' },
      { input: '10', expected: '⟨ 1 2 3 4 5 6 7 8 9 10 ⟩' },
      { input: '7', expected: '⟨ 1 2 3 4 5 6 7 ⟩' },
    ],
    optimalLength: 3, // The optimal BQN solution is "1+↕" (3 chars)
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
        const testCases = (data.test_cases || []).map(tc => ({
          input: tc.input,
          expected: tc.expected_output
        }));
        setProblem({
          ...p,
          isStarter: p.is_starter,
          testCases
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

  // Get examples for display
  const examples = problem?.examples || [];

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

            {/* Examples */}
            {examples.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Examples
                </h2>
                <div className="space-y-2">
                  {examples.map((ex, i) => (
                    <div
                      key={i}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700 font-mono"
                    >
                      <span className="text-gray-500">f </span>
                      <span className="text-gray-300">{ex.input}</span>
                      <span className="text-gray-500 mx-3">→</span>
                      <span className="text-green-400">{ex.output}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
