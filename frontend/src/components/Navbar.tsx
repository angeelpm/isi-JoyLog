import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, Search, LogOut, LayoutDashboard, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <Gamepad2 size={18} className="logo-icon" />
          <span>JOYLOG</span>
        </Link>

        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </Link>
              <Link to="/library" className={`nav-link ${isActive('/library') ? 'active' : ''}`}>
                <BookOpen size={15} />
                <span>Library</span>
              </Link>
              <Link to="/search" className={`nav-link ${isActive('/search') ? 'active' : ''}`}>
                <Search size={15} />
                <span>Search</span>
              </Link>
              <div className="nav-user-menu">
                <Link to="/profile" className={`nav-link profile-link ${isActive('/profile') ? 'active' : ''}`}>
                  <div className="nav-avatar">{user.username.charAt(0).toUpperCase()}</div>
                  <span>{user.username}</span>
                </Link>
                <button onClick={handleLogout} className="logout-btn" title="Logout">
                  <LogOut size={15} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn-primary" style={{ borderRadius: '8px', padding: '0.45rem 1rem' }}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
