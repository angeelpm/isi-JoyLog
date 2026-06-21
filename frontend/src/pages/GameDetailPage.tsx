import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RawgAPI } from '../services/api';
import { LibraryEntryModal } from '../components/LibraryEntryModal';
import { PriceWidget } from '../components/PriceWidget';

export const GameDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    RawgAPI.getGameDetails(id)
      .then(res => setGame(res.data))
      .catch(() => setError('No se pudo cargar este juego.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="page-container" style={{ color: 'var(--text-muted)' }}>Cargando juego...</div>;
  }

  if (error || !game) {
    return (
      <div className="page-container" style={{ color: 'var(--text-muted)' }}>
        {error || 'Juego no encontrado.'} <Link to="/search">Volver a la búsqueda</Link>
      </div>
    );
  }

  const platforms: string[] = game.platforms?.map((p: any) => p.platform.name) || [];
  const genres: string[] = game.genres?.map((g: any) => g.name) || [];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: '0 0 260px', maxWidth: '260px' }}>
          <img
            src={game.background_image || ''}
            alt={game.name}
            style={{
              width: '100%', borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              objectFit: 'cover', aspectRatio: '3/4',
            }}
          />
          <button
            className="btn-primary"
            onClick={() => setShowModal(true)}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '10px' }}
          >
            Añadir / editar en mi librería
          </button>
          <PriceWidget title={game.name} autoFetch />
        </div>

        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <h1 style={{
            fontFamily: "'Unbounded', sans-serif",
            fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
            fontWeight: 900, lineHeight: 1.15,
            marginBottom: '0.75rem',
          }}>
            {game.name}
          </h1>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {genres.map((g) => (
              <span key={g} style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid var(--border)',
                padding: '0.15rem 0.65rem',
                borderRadius: '100px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
              }}>
                {g}
              </span>
            ))}
          </div>

          {platforms.length > 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {platforms.join(' · ')}
            </p>
          )}

          {game.released && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', fontFamily: "'DM Mono', monospace", marginBottom: '1.5rem' }}>
              Lanzamiento: {game.released}
            </p>
          )}

          <div style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
            {game.description_raw ? (
              <p>{game.description_raw}</p>
            ) : (
              <span style={{ fontStyle: 'italic' }}>No hay descripción disponible.</span>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <LibraryEntryModal
          game={{
            rawgGameId: game.id,
            title: game.name,
            coverImage: game.background_image,
            platforms,
            genres,
            status: 'wishlist',
          }}
          onClose={() => setShowModal(false)}
          onUpdated={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
