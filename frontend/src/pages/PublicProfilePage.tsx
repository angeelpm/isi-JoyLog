import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserPlus, UserMinus, Users, Globe } from 'lucide-react';
import { SocialAPI, ListAPI } from '../services/api';
import type { FavoriteGame, GameList } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PublicProfile {
  _id: string;
  username: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  favoriteGames?: FavoriteGame[];
}

interface CommonGame {
  rawgGameId: number | string;
  title: string;
  coverImage?: string;
}

interface PublicStats {
  total: number;
  playing: number;
  completed: number;
  backlog: number;
  dropped: number;
  wishlist: number;
  totalHoursPlayed: number;
  avgRating: number;
}

export const PublicProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followBusy, setFollowBusy] = useState(false);
  const [commonGames, setCommonGames] = useState<CommonGame[] | null>(null);
  const [publicLists, setPublicLists] = useState<GameList[]>([]);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError('');
    setCommonGames(null);
    setPublicLists([]);
    SocialAPI.getPublicProfile(username)
      .then(res => {
        setProfile(res.data);
        if (currentUser && currentUser.id !== res.data._id) {
          SocialAPI.getCommonGames(res.data._id)
            .then(commonRes => setCommonGames(commonRes.data.commonGames || []))
            .catch(() => setCommonGames([]));
        }
        ListAPI.getByUser(res.data._id)
          .then(listsRes => setPublicLists(listsRes.data.lists || []))
          .catch(() => setPublicLists([]));
        return SocialAPI.getPublicStats(res.data._id);
      })
      .then(res => setStats(res.data.stats))
      .catch(() => setError('User not found'))
      .finally(() => setLoading(false));
  }, [username, currentUser]);

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
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>{profile.bio}</p>
          ) : (
            <p style={{ color: 'var(--text-faint)', fontSize: '0.9rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
              <Users size={14} /> No bio yet.
            </p>
          )}

          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '0.75rem',
            }}>
              {[
                { label: 'Games', value: stats.total },
                { label: 'Completed', value: stats.completed },
                { label: 'Hours played', value: stats.totalHoursPlayed },
                { label: 'Avg rating', value: stats.avgRating ? stats.avgRating.toFixed(1) : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {profile.favoriteGames && profile.favoriteGames.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Juegos favoritos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.75rem' }}>
                {profile.favoriteGames.map(fav => (
                  <Link key={fav.rawgGameId} to={`/games/${fav.rawgGameId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <div style={{
                      aspectRatio: '3/4',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: 'var(--bg-surface-2)',
                      backgroundImage: fav.coverImage ? `url(${fav.coverImage})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }} />
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fav.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!isOwnProfile && commonGames !== null && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Juegos en común</h3>
              {commonGames.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.75rem' }}>
                  {commonGames.map(game => (
                    <Link key={game.rawgGameId} to={`/games/${game.rawgGameId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <div style={{
                        aspectRatio: '3/4',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: 'var(--bg-surface-2)',
                        backgroundImage: game.coverImage ? `url(${game.coverImage})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }} />
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {game.title}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>No tenéis juegos en común todavía.</p>
              )}
            </div>
          )}

          {publicLists.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Listas públicas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {publicLists.map(list => (
                  <Link
                    key={list._id}
                    to={`/lists/${list._id}`}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem',
                      background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                      borderRadius: '8px', padding: '0.6rem 0.9rem',
                      textDecoration: 'none', color: 'inherit',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      <Globe size={13} color="var(--text-muted)" />
                      {list.title}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                      {list.games?.length || 0} {list.games?.length === 1 ? 'juego' : 'juegos'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
