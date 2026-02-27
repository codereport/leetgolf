import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getLeaderboard } from '../api';
import { highlightCode } from '../vendor/array-box/src/syntax.js';

const LANGUAGE_LOGOS = {
  bqn: '/logos/bqn.svg',
  apl: '/logos/apl.png',
  j: '/logos/j_logo.png',
  uiua: '/logos/uiua.png',
  kap: '/logos/kap.png',
  tinyapl: '/logos/tinyapl.svg',
};

const LANGUAGE_FONTS = {
  bqn: 'font-bqn',
  apl: 'font-apl',
  j: 'font-j',
  uiua: 'font-uiua',
  kap: 'font-kap',
  tinyapl: 'font-tinyapl',
};

export default function Leaderboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notSolved, setNotSolved] = useState(false);

  const [notAuthenticated, setNotAuthenticated] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        navigate(`/problems/${slug}`);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [slug, navigate]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setNotSolved(false);
    setNotAuthenticated(false);

    getLeaderboard(slug)
      .then((data) => {
        setLeaderboard(data.leaderboard || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.message.includes('must solve')) {
          setNotSolved(true);
        } else if (err.message.includes('Not authenticated') || err.message.includes('authenticated')) {
          setNotAuthenticated(true);
        } else {
          setError(err.message);
        }
        setLoading(false);
      });
  }, [slug]);

  return (
    <div className="min-h-screen bg-gray-900 pt-20 px-8 pb-12 presentation-content">
      <div className="max-w-4xl mx-auto">
        <Link to={`/problems/${slug}`} className="text-green-400 hover:text-green-300 text-sm presentation-hide">
          ← Back to Problem
        </Link>

        <h1 className="text-3xl font-bold text-white mt-6 mb-8">Leaderboard</h1>

        {loading && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-gray-300">
            Loading leaderboard...
          </div>
        )}

        {!loading && notAuthenticated && (
          <div className="bg-gray-800 rounded-lg p-8 border border-blue-600 text-center">
            <div className="text-blue-400 text-xl mb-2">Please log in</div>
            <p className="text-gray-400">
              You need to be logged in and have solved this problem to view the leaderboard.
            </p>
            <Link
              to={`/problems/${slug}`}
              className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Go to Problem
            </Link>
          </div>
        )}

        {!loading && notSolved && !notAuthenticated && (
          <div className="bg-gray-800 rounded-lg p-8 border border-yellow-600 text-center">
            <div className="text-yellow-400 text-xl mb-2">Solve the problem first!</div>
            <p className="text-gray-400">
              You need to successfully submit a solution before viewing the leaderboard.
            </p>
            <Link
              to={`/problems/${slug}`}
              className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Go to Problem
            </Link>
          </div>
        )}

        {!loading && error && !notSolved && !notAuthenticated && (
          <div className="bg-gray-800 rounded-lg p-8 border border-red-600 text-red-300">
            Error: {error}
          </div>
        )}

        {!loading && !error && !notSolved && !notAuthenticated && (
          <>
            {leaderboard.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-gray-400 text-center">
                No submissions yet. Be the first to solve this problem!
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700 bg-gray-800/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        User
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">
                        Lang
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Solution
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                        Chars
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className={`font-mono ${
                            index === 0 ? 'text-yellow-400 font-bold' :
                            index === 1 ? 'text-gray-300' :
                            index === 2 ? 'text-amber-600' :
                            'text-gray-500'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.avatar_url && (
                              <img
                                src={entry.avatar_url}
                                alt={entry.username}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <span className="text-gray-200 font-medium">
                              {entry.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <img
                            src={LANGUAGE_LOGOS[entry.language]}
                            alt={entry.language}
                            className="w-8 h-8 object-contain mx-auto"
                            title={entry.language.toUpperCase()}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <code 
                            className={`${LANGUAGE_FONTS[entry.language]} text-2xl`}
                            dangerouslySetInnerHTML={{ __html: highlightCode(entry.solution, entry.language) }}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-bold text-lg text-gray-300">
                            {entry.char_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
