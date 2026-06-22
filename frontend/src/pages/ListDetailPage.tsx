import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Trash2, Search, UserMinus, Lock, Globe, Plus, UserPlus, X, UserCircle2 } from 'lucide-react';
import { ListAPI, RawgAPI, SocialAPI } from '../services/api';
import type { GameList, PublicUser } from '../services/api';
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
  const [collaboratorQuery, setCollaboratorQuery] = useState('');
  const [collaboratorResults, setCollaboratorResults] = useState<PublicUser[]>([]);
  const [collaboratorBusy, setCollaboratorBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [showAddCollaboratorModal, setShowAddCollaboratorModal] = useState(false);
  const collaboratorSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchList = () => {
    if (!listId) return;
    setLoading(true);
    setError('');
    ListAPI.getOne(listId)
      .then(res => setList(res.data.list))
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
  const canEdit = !!list && !!user && (list.ownerId === user.id || list.collaborators?.some(c => c.userId === user.id));

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

  const handleCollaboratorQueryChange = (value: string) => {
    setCollaboratorQuery(value);
    if (collaboratorSearchTimer.current) clearTimeout(collaboratorSearchTimer.current);
    if (!value.trim()) {
      setCollaboratorResults([]);
      return;
    }
    collaboratorSearchTimer.current = setTimeout(async () => {
      try {
        const res = await SocialAPI.searchUsers(value.trim());
        setCollaboratorResults(res.data.users || []);
      } catch (err) {
        console.error('Failed to search users', err);
      }
    }, 300);
  };

  const handleAddCollaborator = async (candidate: PublicUser) => {
    if (!listId || collaboratorBusy) return;
    setCollaboratorBusy(true);
    try {
      await ListAPI.addCollaborator(listId, candidate._id, candidate.username);
      setCollaboratorQuery('');
      setCollaboratorResults([]);
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
      navigate('/');
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
        {error || 'Lista no encontrada.'} <Link to="/">Volver al dashboard</Link>
      </div>
    );
  }

  const existingCollaboratorIds = new Set(list.collaborators?.map(c => c.userId) || []);

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
          {list.ownerUsername && (
            <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Creada por <Link to={`/u/${list.ownerUsername}`} style={{ color: 'var(--accent-violet)' }}>{list.ownerUsername}</Link>
            </p>
          )}
        </div>
        {isOwner && (
          <button onClick={handleDeleteList} disabled={deleting} className="btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>
            <Trash2 size={14} /> {deleting ? 'Eliminando...' : 'Eliminar lista'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
          Juegos {list.games?.length ? (
            <span style={{
              background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
              borderRadius: '100px', padding: '0.1rem 0.55rem', fontSize: '0.75rem',
              color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", marginLeft: '0.4rem',
            }}>
              {list.games.length}
            </span>
          ) : null}
        </h3>
        {canEdit && (
          <button
            onClick={() => setShowAddGameModal(true)}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <Plus size={14} /> Añadir juego
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
            <Link to={`/games/${game.rawgGameId}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
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
            </Link>
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

      {isOwner && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px',
          padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              Colaboradores {list.collaborators?.length ? (
                <span style={{
                  background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                  borderRadius: '100px', padding: '0.1rem 0.55rem', fontSize: '0.75rem',
                  color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", marginLeft: '0.4rem',
                }}>
                  {list.collaborators.length}
                </span>
              ) : null}
            </h3>
            <button
              onClick={() => setShowAddCollaboratorModal(true)}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              <UserPlus size={14} /> Invitar colaborador
            </button>
          </div>

          {list.collaborators && list.collaborators.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {list.collaborators.map(collab => (
                <div key={collab.userId} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '0.6rem 0.9rem',
                }}>
                  <Link to={`/u/${collab.username}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
                    <UserCircle2 size={22} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-violet)' }}>{collab.username}</span>
                  </Link>
                  <button
                    onClick={() => handleRemoveCollaborator(collab.userId)}
                    title="Quitar colaborador"
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', padding: '0.3rem', borderRadius: '6px',
                      transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,59,92,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>No tienes colaboradores todavía. Invita a otros jugadores para que puedan añadir juegos a esta lista.</p>
          )}
        </div>
      )}

      {showAddGameModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddGameModal(false); }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(10px)', padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{
            maxWidth: '480px', width: '100%', maxHeight: '85vh',
            background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
            borderRadius: '16px', boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'fadeInUp 0.25s ease-out',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Añadir juego a la lista</h3>
              <button
                onClick={() => setShowAddGameModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
                  borderRadius: '50%', width: '30px', height: '30px', color: 'var(--text-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto' }}>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar un juego por título..."
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn-primary" disabled={searching} style={{ padding: '0.6rem 1rem', borderRadius: '8px' }}>
                  <Search size={14} />
                </button>
              </form>
              {searching && <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>Buscando…</p>}
              {!searching && results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {results.slice(0, 8).map(game => {
                    const alreadyAdded = (list.games || []).some(g => String(g.rawgGameId) === String(game.id));
                    return (
                      <button
                        key={game.id}
                        onClick={() => handleAddGame(game)}
                        disabled={alreadyAdded}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                          borderRadius: '10px', padding: '0.5rem 0.75rem', textAlign: 'left',
                          cursor: alreadyAdded ? 'default' : 'pointer', opacity: alreadyAdded ? 0.5 : 1,
                        }}
                      >
                        <div style={{
                          width: '36px', height: '48px', borderRadius: '6px', flexShrink: 0,
                          background: 'var(--bg-surface)',
                          backgroundImage: game.background_image ? `url(${game.background_image})` : undefined,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                        }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {game.name} {alreadyAdded ? <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(ya en la lista)</span> : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddCollaboratorModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddCollaboratorModal(false); setCollaboratorQuery(''); setCollaboratorResults([]); } }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(10px)', padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{
            maxWidth: '420px', width: '100%', maxHeight: '85vh',
            background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
            borderRadius: '16px', boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'fadeInUp 0.25s ease-out',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Invitar colaborador</h3>
              <button
                onClick={() => { setShowAddCollaboratorModal(false); setCollaboratorQuery(''); setCollaboratorResults([]); }}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
                  borderRadius: '50%', width: '30px', height: '30px', color: 'var(--text-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto' }}>
              <input
                type="text"
                value={collaboratorQuery}
                onChange={e => handleCollaboratorQueryChange(e.target.value)}
                placeholder="Buscar por nombre de usuario..."
                autoFocus
                style={{ width: '100%', marginBottom: '1rem' }}
              />
              {collaboratorQuery.trim() && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {collaboratorResults.length === 0 ? (
                    <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>No se encontraron jugadores.</p>
                  ) : (
                    collaboratorResults.map(candidate => {
                      const already = existingCollaboratorIds.has(candidate._id) || candidate._id === list.ownerId;
                      return (
                        <button
                          key={candidate._id}
                          type="button"
                          disabled={already || collaboratorBusy}
                          onClick={() => handleAddCollaborator(candidate)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem',
                            background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                            borderRadius: '10px', padding: '0.55rem 0.85rem', textAlign: 'left',
                            cursor: already ? 'default' : 'pointer', opacity: already ? 0.5 : 1,
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', fontWeight: 600 }}>
                            <UserCircle2 size={20} color="var(--text-muted)" />
                            {candidate.username}
                          </span>
                          {already && <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>ya añadido</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
