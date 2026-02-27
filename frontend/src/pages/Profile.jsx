import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchCurrentUser, getUserSubmissions } from '../api';
import { highlightCode } from '../vendor/array-box/src/syntax.js';

const LANGUAGE_LOGOS = {
  bqn: '/logos/bqn.svg',
  apl: '/logos/apl.png',
  j: '/logos/j_logo.png',
  uiua: '/logos/uiua.png',
  kap: '/logos/kap.png',
  tinyapl: '/logos/tinyapl.svg',
};

const LANGUAGE_NAMES = {
  bqn: 'BQN',
  apl: 'APL',
  j: 'J',
  uiua: 'Uiua',
  kap: 'Kap',
  tinyapl: 'TinyAPL',
};

const LANGUAGE_FONTS = {
  bqn: 'font-bqn',
  apl: 'font-apl',
  j: 'font-j',
  uiua: 'font-uiua',
  kap: 'font-kap',
  tinyapl: 'font-tinyapl',
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [sortField, setSortField] = useState('submitted_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser().then(u => {
      setUser(u);
      setLoading(false);
      if (!u) {
        navigate('/');
      }
    });
    
    getUserSubmissions()
      .then(data => setSubmissions(data.submissions || []))
      .catch(() => setSubmissions([]));
  }, [navigate]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'submitted_at' ? 'desc' : 'asc');
    }
  };

  const sortedSubmissions = [...submissions].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // Handle string comparison for problem_slug
    if (sortField === 'problem_slug') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <span className="text-gray-600 ml-1">↕</span>;
    }
    return <span className="text-green-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 px-8 flex items-center justify-center">
        <div className="text-gray-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20 px-8 pb-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 mb-8">
          <div className="flex items-center gap-6 mb-8">
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-24 h-24 rounded-full border-4 border-gray-600"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">{user.name || user.username}</h1>
              <p className="text-gray-400">@{user.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-400">{user.problemsSolved || 0}</div>
              <div className="text-gray-400 text-sm">Problems Solved</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">{user.totalSubmissions || 0}</div>
              <div className="text-gray-400 text-sm">Solutions Submitted</div>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Previous Problems Solved</h2>
          </div>
          
          {submissions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No problems solved yet. <Link to="/problems" className="text-green-400 hover:underline">Start solving!</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b border-gray-700">
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('problem_slug')}
                    >
                      Problem<SortIcon field="problem_slug" />
                    </th>
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('language')}
                    >
                      Lang<SortIcon field="language" />
                    </th>
                    <th className="px-4 py-3 font-medium text-center">
                      Solution
                    </th>
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('char_count')}
                    >
                      Len<SortIcon field="char_count" />
                    </th>
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('submitted_at')}
                    >
                      Date<SortIcon field="submitted_at" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSubmissions.map((sub, idx) => (
                    <tr 
                      key={`${sub.problem_slug}-${sub.language}-${idx}`}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link 
                          to={`/problems/${sub.problem_slug}`}
                          className="text-white hover:text-green-400 transition-colors text-sm"
                        >
                          {sub.problem_slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <img 
                          src={LANGUAGE_LOGOS[sub.language]} 
                          alt={LANGUAGE_NAMES[sub.language] || sub.language}
                          title={LANGUAGE_NAMES[sub.language] || sub.language}
                          className="w-5 h-5 object-contain"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span 
                          className={`text-base ${LANGUAGE_FONTS[sub.language] || ''}`}
                          dangerouslySetInnerHTML={{ __html: highlightCode(sub.solution, sub.language) }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-green-400 text-sm">{sub.char_count}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
