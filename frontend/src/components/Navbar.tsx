import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, Search, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <Gamepad2 size={24} className="logo-icon" />
          <span>JoyLog</span>
        </Link>
        
        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/" className="nav-link">Dashboard</Link>
              <Link to="/library" className="nav-link">Library</Link>
              <Link to="/search" className="nav-link">
                <Search size={18} />
                <span>Search</span>
              </Link>
              <div className="nav-user-menu">
                <Link to="/profile" className="nav-link profile-link">
                  <User size={18} />
                  <span>{user.username}</span>
                </Link>
                <button onClick={handleLogout} className="logout-btn" title="Logout">
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
