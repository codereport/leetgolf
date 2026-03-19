import { useEffect, useState, useRef, useCallback } from 'react';
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

function ShowcaseTable({ leaderboard }) {
  const bestByLang = new Map();
  for (const entry of leaderboard) {
    const prev = bestByLang.get(entry.language);
    if (!prev || entry.char_count < prev.char_count) {
      bestByLang.set(entry.language, entry);
    }
  }
  const entries = [...bestByLang.values()];
  const mid = Math.ceil(entries.length / 2);
  const left = entries.slice(0, mid);
  const right = entries.slice(mid);
  const rows = Math.max(left.length, right.length);

  const tableRef = useRef(null);
  const [scale, setScale] = useState(1);

  const recalcScale = useCallback(() => {
    const el = tableRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const naturalW = rect.width / scale;
    const naturalH = rect.height / scale;
    const sx = (window.innerWidth * 0.8) / naturalW;
    const sy = (window.innerHeight * 0.8) / naturalH;
    setScale(Math.min(sx, sy));
  }, [scale]);

  useEffect(() => {
    recalcScale();
    window.addEventListener('resize', recalcScale);
    return () => window.removeEventListener('resize', recalcScale);
  }, [recalcScale]);

  const renderCell = (entry, isRight) => (
    <>
      <td className={`${isRight ? 'pl-8' : ''} px-4 py-4 text-center`}>
        <img
          src={LANGUAGE_LOGOS[entry.language]}
          alt={entry.language}
          className="object-contain mx-auto"
          style={{ width: '3.2rem', height: '3.2rem' }}
        />
      </td>
      <td className={`${!isRight ? 'pr-8' : ''} px-4 py-4 text-center`}>
        <code
          className={`${LANGUAGE_FONTS[entry.language]} text-2xl whitespace-nowrap`}
          dangerouslySetInnerHTML={{ __html: highlightCode(entry.solution, entry.language) }}
        />
      </td>
    </>
  );

  return (
    <table
      ref={tableRef}
      style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
    >
      <tbody>
        {Array.from({ length: rows }, (_, i) => (
          <tr key={i}>
            {left[i] ? renderCell(left[i], false) : <><td /><td /></>}
            {right[i] ? renderCell(right[i], true) : <><td /><td /></>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Leaderboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notSolved, setNotSolved] = useState(false);

  const [notAuthenticated, setNotAuthenticated] = useState(false);
  const [hiddenRows, setHiddenRows] = useState(new Set());
  const [hiddenCols, setHiddenCols] = useState(new Set());
  const [showcaseMode, setShowcaseMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        navigate(`/problems/${slug}`);
      }
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        setShowcaseMode(prev => !prev);
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
    <div className={`min-h-screen px-8 pb-12 presentation-content ${showcaseMode ? 'bg-gray-800 flex items-center justify-center' : 'bg-gray-900 pt-20'}`}>
      <div className={showcaseMode ? '' : 'max-w-4xl mx-auto'}>
        {!showcaseMode && (
          <Link to={`/problems/${slug}`} className="text-green-400 hover:text-green-300 text-sm presentation-hide">
            ← Back to Problem
          </Link>
        )}

        {!showcaseMode && (
          <h1 className="text-3xl font-bold text-white mt-6 mb-8">Leaderboard</h1>
        )}

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
            ) : showcaseMode ? (
              <ShowcaseTable leaderboard={leaderboard} />
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700 bg-gray-800/50">
                      {[
                        { key: 'rank', label: '#', className: 'text-left w-12' },
                        { key: 'user', label: 'User', className: 'text-left' },
                        { key: 'lang', label: 'Lang', className: 'text-center w-20' },
                        { key: 'solution', label: 'Solution', className: 'text-center' },
                        { key: 'chars', label: 'Chars', className: 'text-right w-24' },
                      ].filter(col => !hiddenCols.has(col.key)).map(col => (
                        <th
                          key={col.key}
                          className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide select-none ${col.className}`}
                          title="Ctrl+click to hide"
                          onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                              e.preventDefault();
                              setHiddenCols(prev => new Set([...prev, col.key]));
                            }
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => {
                      if (hiddenRows.has(entry.id)) return null;
                      return (
                      <tr
                        key={entry.id}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                        onClick={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            setHiddenRows(prev => {
                              const next = new Set(prev);
                              next.add(entry.id);
                              return next;
                            });
                          }
                        }}
                      >
                        {!hiddenCols.has('rank') && (
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
                        )}
                        {!hiddenCols.has('user') && (
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
                        )}
                        {!hiddenCols.has('lang') && (
                        <td className="px-4 py-3 text-center">
                          <img
                            src={LANGUAGE_LOGOS[entry.language]}
                            alt={entry.language}
                            className="w-8 h-8 object-contain mx-auto"
                            title={entry.language.toUpperCase()}
                          />
                        </td>
                        )}
                        {!hiddenCols.has('solution') && (
                        <td className="px-4 py-3 text-center">
                          <code 
                            className={`${LANGUAGE_FONTS[entry.language]} text-2xl`}
                            dangerouslySetInnerHTML={{ __html: highlightCode(entry.solution, entry.language) }}
                          />
                        </td>
                        )}
                        {!hiddenCols.has('chars') && (
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-bold text-lg text-gray-300">
                            {entry.char_count}
                          </span>
                        </td>
                        )}
                      </tr>
                      );
                    })}
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
