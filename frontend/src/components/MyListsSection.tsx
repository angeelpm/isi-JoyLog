import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Lock, Globe, ListChecks, X } from 'lucide-react';
import { ListAPI } from '../services/api';
import type { GameList } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const MyListsSection = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<GameList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchLists = () => {
    setLoading(true);
    ListAPI.getMine()
      .then(res => setLists(res.data.lists || []))
      .catch(() => setLists([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLists(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      await ListAPI.create({ title, description, isPublic });
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setIsPublic(false);
      fetchLists();
    } catch (err) {
      console.error('Failed to create list', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ marginTop: '3.5rem' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem'
      }}>
        <div>
          <p style={{
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem'
          }}>
            Colaborativas
          </p>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Tus listas</h2>
        </div>
        <button
          className="btn-secondary"
          onClick={() => setShowCreate(true)}
          style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Plus size={14} /> Crear lista
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando listas...</p>
      ) : lists.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border-strong)',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
        }}>
          <ListChecks size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Todavía no tienes listas. Crea la primera para organizar juegos con otros.
          </p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>Crear la primera lista</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {lists.map(list => (
            <Link
              key={list._id}
              to={`/lists/${list._id}`}
              style={{
                display: 'block',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '1.25rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{list.title}</h3>
                {list.isPublic ? <Globe size={14} color="var(--text-muted)" /> : <Lock size={14} color="var(--text-muted)" />}
              </div>
              {list.description && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{list.description}</p>
              )}
              <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                {list.games?.length || 0} {list.games?.length === 1 ? 'juego' : 'juegos'}
                {list.ownerId !== user?.id && ' · colaboras'}
              </p>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(10px)', padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <form
            onSubmit={handleCreate}
            style={{
              maxWidth: '440px', width: '100%',
              background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
              borderRadius: '16px', boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              animation: 'fadeInUp 0.25s ease-out',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Nueva lista</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
                  borderRadius: '50%', width: '30px', height: '30px', color: 'var(--text-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label htmlFor="list-title" style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Título
                </label>
                <input
                  id="list-title"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej. Joyas indie 2024"
                  required
                  autoFocus
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label htmlFor="list-description" style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Descripción <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(opcional)</span>
                </label>
                <textarea
                  id="list-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="¿De qué trata esta lista?"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Visibilidad
                </p>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                      padding: '0.85rem 0.5rem', borderRadius: '10px', cursor: 'pointer',
                      border: `1px solid ${!isPublic ? 'var(--accent)' : 'var(--border)'}`,
                      background: !isPublic ? 'rgba(255,59,92,0.08)' : 'var(--bg-surface-2)',
                      color: !isPublic ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <Lock size={16} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Privada</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                      padding: '0.85rem 0.5rem', borderRadius: '10px', cursor: 'pointer',
                      border: `1px solid ${isPublic ? 'var(--accent)' : 'var(--border)'}`,
                      background: isPublic ? 'rgba(255,59,92,0.08)' : 'var(--bg-surface-2)',
                      color: isPublic ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <Globe size={16} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Pública</span>
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '0.5rem' }}>
                  {isPublic ? 'Cualquiera podrá ver esta lista desde tu perfil.' : 'Solo tú y tus colaboradores podréis verla.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px' }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={creating || !title.trim()} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px' }}>
                {creating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
