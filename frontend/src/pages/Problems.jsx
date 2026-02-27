import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProblems } from '../api';

// Hardcoded starter problems (shown even if backend is down)
const STARTER_PROBLEMS = [
  {
    id: 'starter-iota',
    slug: 'iota',
    title: 'Iota',
    description: 'Generate a range of integers from 1 to n',
    difficulty: 'Easy',
    isStarter: true,
  },
  {
    id: 'starter-iota-rotate',
    slug: 'iota-rotate',
    title: 'Iota Rotate',
    description: 'Rotate a range of integers by k positions',
    difficulty: 'Easy',
    isStarter: true,
  },
  {
    id: 'starter-iota-hill',
    slug: 'iota-hill',
    title: 'Iota Hill',
    description: 'Concatenate a range with its reverse',
    difficulty: 'Easy',
    isStarter: true,
  },
];

const PWC_PROBLEMS = [
  {
    id: 'pwc-echo-chamber',
    slug: 'echo-chamber',
    title: 'Echo Chamber',
    description: 'Repeat each character by its 1-based index position',
    difficulty: 'Easy',
  }
];

export default function Problems() {
  const [backendProblems, setBackendProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchProblems()
      .then((data) => {
        if (!isMounted) return;
        setBackendProblems(data.problems || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setBackendError(err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const localSlugs = new Set([
    ...STARTER_PROBLEMS.map(p => p.slug),
    ...PWC_PROBLEMS.map(p => p.slug),
  ]);
  const filteredBackendProblems = backendProblems.filter(p => !localSlugs.has(p.slug));

  return (
    <div className="min-h-screen bg-gray-900 pt-20 px-8 pb-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Problems</h1>
          <p className="text-gray-400">
            Solve problems in the fewest characters possible. Start with the starter problem to learn the basics!
          </p>
        </div>

        {/* Starter Problems Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-green-400 uppercase tracking-wide mb-4">
            Get Started
          </h2>
          <div className="space-y-4">
            {STARTER_PROBLEMS.map((problem) => (
              <Link
                key={problem.id}
                to={`/problems/${problem.slug}`}
                className="block bg-gradient-to-r from-green-900/30 to-gray-800 border border-green-700/50 rounded-lg p-6 hover:border-green-500 transition group"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-white group-hover:text-green-400 transition">
                    {problem.title}
                  </h2>
                  <span className="text-xs uppercase tracking-wide bg-green-600 text-white px-2 py-0.5 rounded-full">
                    Starter
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                    {problem.difficulty}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-2">{problem.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* PWC Problems Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-orange-400 uppercase tracking-wide mb-4">
            PWC
          </h2>
          <div className="space-y-4">
            {PWC_PROBLEMS.map((problem) => (
              <Link
                key={problem.id}
                to={`/problems/${problem.slug}`}
                className="block bg-gradient-to-r from-orange-900/30 to-gray-800 border border-orange-700/50 rounded-lg p-6 hover:border-orange-500 transition group"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-white group-hover:text-orange-400 transition">
                    {problem.title}
                  </h2>
                  <span className="text-xs uppercase tracking-wide bg-orange-500 text-white px-2 py-0.5 rounded-full">
                    PWC
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                    {problem.difficulty}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-2">{problem.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Loading indicator for backend problems */}
        {loading && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-gray-400 text-sm">
            Loading more problems...
          </div>
        )}

        {/* Backend Problems Section */}
        {!loading && filteredBackendProblems.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-400 uppercase tracking-wide mb-4">
              All Problems
            </h2>
            <div className="space-y-4">
              {filteredBackendProblems.map((problem) => (
                <Link
                  key={problem.id}
                  to={`/problems/${problem.slug}`}
                  className="block bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-green-500 transition group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white group-hover:text-green-400 transition">
                        {problem.title}
                      </h2>
                      {problem.description && (
                        <p className="text-gray-400 text-sm mt-1">{problem.description}</p>
                      )}
                    </div>
                    {problem.is_starter && (
                      <span className="text-xs uppercase tracking-wide bg-green-600 text-white px-3 py-1 rounded-full">
                        Starter
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Message if only starters available */}
        {!loading && backendError && (
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 text-center">
            <p className="text-gray-400 text-sm">
              More problems coming soon! Try the starter problem above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
