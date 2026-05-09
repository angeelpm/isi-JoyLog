import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthAPI } from '../services/api';

export const ProfilePage = () => {
  const { user, login } = useAuth();
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.bio) {
      setBio(user.bio);
    }
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

  return (
    <div className="page-container" style={{ maxWidth: '600px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Profile</h1>
      
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            fontWeight: 'bold',
            color: 'white'
          }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ color: 'var(--text-main)', marginBottom: '0.2rem' }}>{user.username}</h2>
            <div style={{ color: 'var(--text-muted)' }}>{user.email}</div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Bio</label>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            style={{ width: '100%', resize: 'vertical' }}
            placeholder="Tell us about your gaming habits..."
          />
        </div>

        <button 
          className="btn-primary" 
          onClick={handleSave} 
          disabled={saving}
          style={{ width: '100%' }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
};
