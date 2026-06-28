import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/v1/auth/register', { username, email, password });
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message);
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 62px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
    }}>
      {/* Ghost backdrop text */}
      <div aria-hidden style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: "'Unbounded', sans-serif",
        fontSize: 'clamp(6rem, 18vw, 14rem)',
        fontWeight: 900,
        color: 'transparent',
        WebkitTextStroke: '1px rgba(255,255,255,0.035)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
        whiteSpace: 'nowrap',
        letterSpacing: '0.05em',
      }}>
        JOYLOG
      </div>

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem'
          }}>
            Game Vault
          </p>
          <h1 style={{
            fontFamily: "'Unbounded', sans-serif",
            fontSize: '1.65rem', fontWeight: 900, lineHeight: 1.1
          }}>
            Build your vault
          </h1>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderTop: '2px solid var(--accent-violet)',
          borderRadius: '16px',
          padding: '2rem',
        }}>
          {error && (
            <div style={{
              background: 'rgba(255, 59, 92, 0.08)',
              border: '1px solid rgba(255, 59, 92, 0.25)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: 'var(--accent)',
              marginBottom: '1.75rem',
              fontSize: '0.88rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="gamertag"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', borderRadius: '10px', background: 'var(--accent-violet)', marginTop: '0.25rem' }}
            >
              Create Account
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Already have a vault?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};
