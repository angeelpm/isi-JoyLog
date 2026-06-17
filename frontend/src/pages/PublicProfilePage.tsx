import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserPlus, UserMinus, Users } from 'lucide-react';
import { SocialAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PublicProfile {
  _id: string;
  username: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export const PublicProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError('');
    SocialAPI.getPublicProfile(username)
      .then(res => setProfile(res.data))
      .catch(() => setError('User not found'))
      .finally(() => setLoading(false));
  }, [username]);

  const toggleFollow = async () => {
    if (!profile || followBusy) return;
    setFollowBusy(true);
    try {
      if (profile.isFollowing) {
        await SocialAPI.unfollow(profile._id);
        setProfile({ ...profile, isFollowing: false, followersCount: profile.followersCount - 1 });
      } else {
        await SocialAPI.follow(profile._id);
        setProfile({ ...profile, isFollowing: true, followersCount: profile.followersCount + 1 });
      }
    } catch (err) {
      console.error('Failed to toggle follow', err);
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return <div className="page-container" style={{ color: 'var(--text-muted)' }}>Loading profile...</div>;
  }

  if (error || !profile) {
    return (
      <div className="page-container" style={{ color: 'var(--text-muted)' }}>
        {error || 'User not found'}. <Link to="/">Back to dashboard</Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === profile.username;
  const initial = profile.username.charAt(0).toUpperCase();

  return (
    <div className="page-container" style={{ maxWidth: '640px' }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(155, 127, 244, 0.15) 0%, rgba(255, 59, 92, 0.1) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '2rem',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
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
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.15rem' }}>
              {profile.username}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span><strong style={{ color: 'var(--text-primary)' }}>{profile.followersCount}</strong> followers</span>
              <span><strong style={{ color: 'var(--text-primary)' }}>{profile.followingCount}</strong> following</span>
            </div>
          </div>
          {!isOwnProfile && (
            <button
              onClick={toggleFollow}
              disabled={followBusy}
              className={profile.isFollowing ? 'btn-secondary' : 'btn-primary'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', opacity: followBusy ? 0.6 : 1 }}
            >
              {profile.isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
              {profile.isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>

        <div style={{ padding: '2rem' }}>
          {profile.bio ? (
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{profile.bio}</p>
          ) : (
            <p style={{ color: 'var(--text-faint)', fontSize: '0.9rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={14} /> No bio yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
