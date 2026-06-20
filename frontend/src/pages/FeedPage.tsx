import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Star, CheckCircle2 } from 'lucide-react';
import { SocialAPI, FeedAPI } from '../services/api';
import type { FeedItem } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const FeedPage = () => {
  const { user } = useAuth();
  const [following, setFollowing] = useState<{ _id: string; username: string }[] | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadFeed = useCallback((userIds: string[], pageToLoad: number) => {
    return FeedAPI.getFeed(userIds, pageToLoad).then(res => {
      setItems(prev => (pageToLoad === 1 ? res.data.items : [...prev, ...res.data.items]));
      setPage(res.data.page);
      setHasMore(res.data.hasMore);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    SocialAPI.getFollowing(user.id)
      .then(res => {
        const followingList = res.data ?? [];
        setFollowing(followingList);
        const userIds = followingList.map((f: { _id: string }) => f._id);
        if (userIds.length === 0) return;
        return loadFeed(userIds, 1);
      })
      .catch(() => setError('No se pudo cargar el feed.'))
      .finally(() => setLoading(false));
  }, [user, loadFeed]);

  const handleLoadMore = () => {
    if (!following || loadingMore) return;
    const userIds = following.map(f => f._id);
    setLoadingMore(true);
    loadFeed(userIds, page + 1).finally(() => setLoadingMore(false));
  };

  if (loading) {
    return <div className="page-container" style={{ color: 'var(--text-muted)' }}>Cargando feed...</div>;
  }

  if (error) {
    return <div className="page-container" style={{ color: 'var(--text-muted)' }}>{error}</div>;
  }

  if (!following || following.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: '640px' }}>
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <Users size={28} style={{ marginBottom: '0.75rem' }} />
          <p style={{ marginBottom: '1rem' }}>Todavía no sigues a nadie. Sigue a otros jugadores para ver su actividad aquí.</p>
          <Link to="/search" className="btn-primary" style={{ display: 'inline-block', padding: '0.6rem 1.2rem', borderRadius: '8px' }}>
            Buscar usuarios
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: '640px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Las personas que sigues todavía no tienen actividad.</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map((item, idx) => (
          <div
            key={`${item.gameEntryId}-${item.reviewLogId ?? idx}`}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              gap: '1rem',
            }}
          >
            {item.coverImage && (
              <img
                src={item.coverImage}
                alt={item.title}
                style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                <strong>{item.username}</strong>{' '}
                {item.type === 'review' ? 'reseñó' : 'completó'}{' '}
                <strong>{item.title}</strong>
                {item.type === 'completed' && (
                  <CheckCircle2 size={14} style={{ marginLeft: '0.35rem', color: 'var(--accent)', verticalAlign: 'middle' }} />
                )}
              </p>
              {item.type === 'review' && item.text && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{item.text}</p>
              )}
              {item.type === 'review' && typeof item.rating === 'number' && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <Star size={12} /> {item.rating}/10
                </p>
              )}
              {/* TODO(Fase 1 - comments): reusar componentes de like/comentario inline aquí
                  una vez que feature/social-comments-frontend esté mergeada a develop. */}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="btn-secondary"
          style={{ marginTop: '1.5rem', width: '100%', padding: '0.7rem', borderRadius: '10px', opacity: loadingMore ? 0.6 : 1 }}
        >
          {loadingMore ? 'Cargando...' : 'Cargar más'}
        </button>
      )}
    </div>
  );
};
