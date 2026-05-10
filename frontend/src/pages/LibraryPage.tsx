import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { LibraryAPI } from '../services/api';
import { GameCard } from '../components/GameCard';
import { LibraryEntryModal } from '../components/LibraryEntryModal';

const STATUS_TABS = [
  { value: 'all',       label: 'All' },
  { value: 'playing',   label: 'Playing' },
  { value: 'completed', label: 'Completed' },
  { value: 'backlog',   label: 'Backlog' },
  { value: 'wishlist',  label: 'Wishlist' },
  { value: 'dropped',   label: 'Dropped' },
];

const STATUS_COLORS: Record<string, string> = {
  playing:   'var(--status-playing)',
  completed: 'var(--status-completed)',
  dropped:   'var(--status-dropped)',
  wishlist:  'var(--status-wishlist)',
  backlog:   'var(--status-backlog)',
};

export const LibraryPage = () => {
  const [games, setGames] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<any>(null);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const { data } = await LibraryAPI.getGames(statusFilter);
      setGames(data.entries);
    } catch (error) {
      console.error('Error fetching library:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLibrary(); }, [statusFilter]);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem'
        }}>
          Game Vault
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{
            fontFamily: "'Unbounded', sans-serif",
            fontSize: 'clamp(1.6rem, 4vw, 2.5rem)',
            fontWeight: 900, lineHeight: 1
          }}>
            My Library
          </h1>
          <Link to="/search" className="btn-primary">
            <Plus size={15} />
            Add Game
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
        marginBottom: '2rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid var(--border)'
      }}>
        {STATUS_TABS.map(tab => {
          const active = statusFilter === tab.value;
          const dotColor = STATUS_COLORS[tab.value];
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 1rem',
                borderRadius: '100px',
                fontSize: '0.85rem',
                fontWeight: active ? 600 : 500,
                border: active ? 'none' : '1px solid var(--border-strong)',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
            >
              {dotColor && tab.value !== 'all' && (
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: active ? 'rgba(255,255,255,0.7)' : dotColor,
                  display: 'inline-block', flexShrink: 0
                }} />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Count */}
      {!loading && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-primary)', fontWeight: 500 }}>
            {games.length}
          </span>{' '}
          {games.length === 1 ? 'game' : 'games'}
          {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading library...</p>
      ) : games.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border-strong)',
          borderRadius: '16px',
          padding: '4rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          No games here yet.{' '}
          <Link to="/search" style={{ color: 'var(--accent)' }}>Search and add some.</Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))',
          gap: '1rem'
        }}>
          {games.map(game => (
            <GameCard key={game._id} game={game} onClick={() => setSelectedGame(game)} />
          ))}
        </div>
      )}

      {selectedGame && (
        <LibraryEntryModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onUpdated={() => { fetchLibrary(); setSelectedGame(null); }}
        />
      )}
    </div>
  );
};
