import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ user }) {
  const location = useLocation();
  
  // Don't show navbar on landing page
  if (location.pathname === '/') {
    return null;
  }

  const navLinks = [
    { to: '/problems', label: 'Problems' },
    { to: '/contests', label: 'Contests' },
    { to: '/profile', label: 'Profile' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-white">
          Leet<span className="text-green-400">Golf</span>
        </Link>
        
        <div className="flex items-center gap-6">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'text-green-400'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          
          {user && (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-8 h-8 rounded-full border-2 border-gray-600"
            />
          )}
        </div>
      </div>
    </nav>
  );
}
