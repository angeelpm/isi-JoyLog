import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LoginPage = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await api.post('/api/auth/login', { usernameOrEmail, password });
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
    <div className="page-container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
      <div className="glass-card">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--accent-green)' }}>Welcome Back</h2>
        
        {error && <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Username or Email</label>
            <input 
              type="text" 
              value={usernameOrEmail} 
              onChange={(e) => setUsernameOrEmail(e.target.value)} 
              required 
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%' }}
            />
          </div>
          
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '0.75rem' }}>
            Login
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-blue)' }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
};
