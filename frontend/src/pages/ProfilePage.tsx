import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Search, Lock, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthAPI, RawgAPI, ListAPI } from '../services/api';
import type { FavoriteGame, GameList } from '../services/api';

export const ProfilePage = () => {
  const { user, login } = useAuth();
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteGame[]>([]);
  const [favQuery, setFavQuery] = useState('');
  const [favResults, setFavResults] = useState<any[]>([]);
  const [favSearching, setFavSearching] = useState(false);
  const [savingFavorites, setSavingFavorites] = useState(false);
  const [myLists, setMyLists] = useState<GameList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
    if (user?.bio) setBio(user.bio);
    setFavorites(user?.favoriteGames || []);
  }, [user]);

  useEffect(() => {
    setLoadingLists(true);
    ListAPI.getMine()
      .then(res => setMyLists(res.data.lists || []))
      .catch(() => setMyLists([]))
      .finally(() => setLoadingLists(false));
  }, []);

  const handleFavSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!favQuery.trim()) return;
    setFavSearching(true);
    try {
      const res = await RawgAPI.searchGames(favQuery);
      setFavResults(res.data.results || []);
    } catch (err) {
      console.error('Failed to search games', err);
    } finally {
      setFavSearching(false);
    }
  };

  const persistFavorites = async (next: FavoriteGame[]) => {
    setFavorites(next);
    setSavingFavorites(true);
    try {
      const response = await AuthAPI.updateProfile({ favoriteGames: next });
      const newToken = localStorage.getItem('token') || '';
      login(newToken, response.data.user);
    } catch (err) {
      console.error('Failed to update favorites', err);
    } finally {
      setSavingFavorites(false);
    }
  };

  const addFavorite = (game: any) => {
    if (favorites.some(f => String(f.rawgGameId) === String(game.id))) return;
    persistFavorites([...favorites, { rawgGameId: game.id, title: game.name, coverImage: game.background_image }]);
  };

  const removeFavorite = (rawgGameId: number | string) => {
    persistFavorites(favorites.filter(f => String(f.rawgGameId) !== String(rawgGameId)));
  };

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
            <Link
              to={`/u/${user.username}`}
              style={{ color: 'var(--accent-violet)', fontSize: '0.78rem', textDecoration: 'none' }}
            >
              View public profile →
            </Link>
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

        {/* Favorites section */}
        <div style={{ padding: '2rem', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Mis juegos favoritos</h3>

          {favorites.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}>
              {favorites.map(fav => (
                <div key={fav.rawgGameId} style={{ position: 'relative' }}>
                  <Link to={`/games/${fav.rawgGameId}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
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
                  <button
                    onClick={() => removeFavorite(fav.rawgGameId)}
                    disabled={savingFavorites}
                    title="Quitar de favoritos"
                    style={{
                      position: 'absolute', top: '0.25rem', right: '0.25rem',
                      background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                      width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', cursor: 'pointer',
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Todavía no tienes juegos favoritos.
            </p>
          )}

          <form onSubmit={handleFavSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={favQuery}
              onChange={(e) => setFavQuery(e.target.value)}
              placeholder="Buscar un juego para añadir a favoritos..."
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-secondary" disabled={favSearching} style={{ padding: '0.6rem 1rem', borderRadius: '8px' }}>
              <Search size={14} />
            </button>
          </form>

          {favResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {favResults.slice(0, 5).map(game => (
                <button
                  key={game.id}
                  onClick={() => addFavorite(game)}
                  disabled={favorites.some(f => String(f.rawgGameId) === String(game.id))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer',
                    opacity: favorites.some(f => String(f.rawgGameId) === String(game.id)) ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: '0.85rem' }}>{game.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lists section */}
        <div style={{ padding: '2rem', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Mis listas</h3>
          {loadingLists ? (
            <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>Cargando listas...</p>
          ) : myLists.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {myLists.map(list => (
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
                    {list.isPublic ? <Globe size={13} color="var(--text-muted)" /> : <Lock size={13} color="var(--text-muted)" />}
                    {list.title}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                    {list.games?.length || 0} {list.games?.length === 1 ? 'juego' : 'juegos'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>
              Todavía no tienes listas. <Link to="/" style={{ color: 'var(--accent-violet)' }}>Crea una desde el dashboard</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
