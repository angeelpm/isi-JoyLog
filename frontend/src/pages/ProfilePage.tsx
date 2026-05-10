import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthAPI } from '../services/api';

export const ProfilePage = () => {
  const { user, login } = useAuth();
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.bio) setBio(user.bio);
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await AuthAPI.updateProfile({ bio });
      const newToken = localStorage.getItem('token') || '';
      login(newToken, response.data.user);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initial = user.username.charAt(0).toUpperCase();

  return (
    <div className="page-container" style={{ maxWidth: '640px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem'
        }}>
          Account
        </p>
        <h1 style={{
          fontFamily: "'Unbounded', sans-serif",
          fontSize: 'clamp(1.4rem, 4vw, 2rem)',
          fontWeight: 900, lineHeight: 1
        }}>
          Profile
        </h1>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        {/* Avatar banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(155, 127, 244, 0.15) 0%, rgba(255, 59, 92, 0.1) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '2rem',
          display: 'flex', alignItems: 'center', gap: '1.5rem',
        }}>
          <div style={{
            width: '80px', height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-violet), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Unbounded', sans-serif",
            fontSize: '2rem', fontWeight: 700, color: '#fff',
            flexShrink: 0,
            boxShadow: '0 0 0 3px rgba(255,255,255,0.08)',
          }}>
            {initial}
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.15rem' }}>
              {user.username}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user.email}</p>
          </div>
        </div>

        {/* Bio section */}
        <div style={{ padding: '2rem' }}>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell us about your gaming habits..."
              style={{ marginTop: '0.5rem' }}
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', padding: '0.85rem', borderRadius: '10px' }}
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};
