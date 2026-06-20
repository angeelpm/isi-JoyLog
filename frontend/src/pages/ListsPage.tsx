import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Lock, Globe } from 'lucide-react';
import { ListAPI } from '../services/api';
import type { GameList } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ListsPage = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<GameList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchLists = () => {
    setLoading(true);
    setError('');
    ListAPI.getMine()
      .then(res => setLists(res.data.lists || []))
      .catch(() => setError('No se pudieron cargar tus listas.'))
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
    <div className="page-container">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Colaborativas
          </p>
          <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', fontWeight: 900, lineHeight: 1 }}>
            Mis listas
          </h1>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> Crear lista
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando listas...</p>
      ) : error ? (
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
      ) : lists.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border-strong)',
          borderRadius: '16px',
          padding: '4rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          Todavía no tienes listas. Crea la primera para empezar a organizar juegos con otros.
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
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <form
            onSubmit={handleCreate}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px',
              padding: '2rem', width: '90%', maxWidth: '420px',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Nueva lista</h2>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="list-title" className="form-label">Título</label>
              <input id="list-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required style={{ marginTop: '0.4rem' }} />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="list-description" className="form-label">Descripción</label>
              <textarea id="list-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ marginTop: '0.4rem' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
              Lista pública
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px' }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={creating} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px' }}>
                {creating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
