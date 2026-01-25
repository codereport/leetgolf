import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser, logout } from '../api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser().then(u => {
      setUser(u);
      setLoading(false);
      if (!u) {
        navigate('/');
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/');
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
    <div className="min-h-screen bg-gray-900 pt-20 px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <div className="flex items-center gap-6 mb-8">
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-24 h-24 rounded-full border-4 border-green-400"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">{user.name || user.username}</h1>
              <p className="text-gray-400">@{user.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-400">0</div>
              <div className="text-gray-400 text-sm">Problems Solved</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">0</div>
              <div className="text-gray-400 text-sm">Contests Joined</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">-</div>
              <div className="text-gray-400 text-sm">Best Rank</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
