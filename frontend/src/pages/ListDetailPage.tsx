import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Trash2, Search, UserMinus, Lock, Globe } from 'lucide-react';
import { ListAPI, RawgAPI } from '../services/api';
import type { GameList } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ListDetailPage = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [list, setList] = useState<GameList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [collaboratorId, setCollaboratorId] = useState('');
  const [collaboratorBusy, setCollaboratorBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchList = () => {
    if (!listId) return;
    setLoading(true);
    setError('');
    ListAPI.getOne(listId)
      .then(res => setList(res.data))
      .catch((err) => {
        if (err?.response?.status === 403) {
          setError('No tienes permiso para ver esta lista.');
        } else if (err?.response?.status === 404) {
          setError('Esta lista no existe.');
        } else {
          setError('No se pudo cargar la lista.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchList(); }, [listId]);

  const isOwner = !!list && !!user && list.ownerId === user.id;
  const canEdit = !!list && !!user && (list.ownerId === user.id || list.collaboratorIds?.includes(user.id));

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await RawgAPI.searchGames(query);
      setResults(res.data.results || []);
    } catch (err) {
      console.error('Failed to search games', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddGame = async (game: any) => {
    if (!listId) return;
    try {
      await ListAPI.addGame(listId, { rawgGameId: game.id, title: game.name, coverImage: game.background_image });
      fetchList();
    } catch (err) {
      console.error('Failed to add game to list', err);
    }
  };

  const handleRemoveGame = async (rawgGameId: number | string) => {
    if (!listId) return;
    try {
      await ListAPI.removeGame(listId, rawgGameId);
      fetchList();
    } catch (err) {
      console.error('Failed to remove game from list', err);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listId || !collaboratorId.trim() || collaboratorBusy) return;
    setCollaboratorBusy(true);
    try {
      await ListAPI.addCollaborator(listId, collaboratorId.trim());
      setCollaboratorId('');
      fetchList();
    } catch (err) {
      console.error('Failed to add collaborator', err);
    } finally {
      setCollaboratorBusy(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!listId) return;
    try {
      await ListAPI.removeCollaborator(listId, userId);
      fetchList();
    } catch (err) {
      console.error('Failed to remove collaborator', err);
    }
  };

  const handleDeleteList = async () => {
    if (!listId || deleting) return;
    setDeleting(true);
    try {
      await ListAPI.remove(listId);
      navigate('/lists');
    } catch (err) {
      console.error('Failed to delete list', err);
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="page-container" style={{ color: 'var(--text-muted)' }}>Cargando lista...</div>;
  }

  if (error || !list) {
    return (
      <div className="page-container" style={{ color: 'var(--text-muted)' }}>
        {error || 'Lista no encontrada.'} <Link to="/lists">Volver a mis listas</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900 }}>
              {list.title}
            </h1>
            {list.isPublic ? <Globe size={16} color="var(--text-muted)" /> : <Lock size={16} color="var(--text-muted)" />}
          </div>
          {list.description && <p style={{ color: 'var(--text-muted)' }}>{list.description}</p>}
        </div>
        {isOwner && (
          <button onClick={handleDeleteList} disabled={deleting} className="btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>
            <Trash2 size={14} /> {deleting ? 'Eliminando...' : 'Eliminar lista'}
          </button>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {(list.games || []).map(game => (
          <div key={game.rawgGameId} style={{ position: 'relative' }}>
            <div style={{
              aspectRatio: '3/4',
              borderRadius: '10px',
              overflow: 'hidden',
              background: 'var(--bg-surface-2)',
              backgroundImage: game.coverImage ? `url(${game.coverImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />
            <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {game.title}
            </p>
            {canEdit && (
              <button
                onClick={() => handleRemoveGame(game.rawgGameId)}
                title="Quitar de la lista"
                style={{
                  position: 'absolute', top: '0.4rem', right: '0.4rem',
                  background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                  width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', cursor: 'pointer',
                }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {(!list.games || list.games.length === 0) && (
          <p style={{ color: 'var(--text-faint)' }}>Esta lista todavía no tiene juegos.</p>
        )}
      </div>

      {canEdit && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px',
          padding: '1.5rem', marginBottom: '2rem',
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Añadir juego</h3>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar un juego..."
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-secondary" disabled={searching} style={{ padding: '0.6rem 1rem', borderRadius: '8px' }}>
              <Search size={14} />
            </button>
          </form>
          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {results.slice(0, 5).map(game => (
                <button
                  key={game.id}
                  onClick={() => handleAddGame(game)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '0.85rem' }}>{game.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isOwner && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px',
          padding: '1.5rem',
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Colaboradores</h3>
          <form onSubmit={handleAddCollaborator} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={collaboratorId}
              onChange={e => setCollaboratorId(e.target.value)}
              placeholder="ID del usuario a invitar"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-secondary" disabled={collaboratorBusy} style={{ padding: '0.6rem 1rem', borderRadius: '8px' }}>
              Añadir
            </button>
          </form>
          {list.collaboratorIds && list.collaboratorIds.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {list.collaboratorIds.map(cid => (
                <div key={cid} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '0.5rem 0.75rem',
                }}>
                  <span style={{ fontSize: '0.85rem' }}>{cid}</span>
                  <button
                    onClick={() => handleRemoveCollaborator(cid)}
                    title="Quitar colaborador"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>No tienes colaboradores todavía.</p>
          )}
        </div>
      )}
    </div>
  );
};
