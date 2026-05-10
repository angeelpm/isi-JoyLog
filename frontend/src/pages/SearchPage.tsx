import { useState } from 'react';
import { Search } from 'lucide-react';
import { RawgAPI } from '../services/api';
import { LibraryEntryModal } from '../components/LibraryEntryModal';

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await RawgAPI.searchGames(query);
      setResults(response.data.results);
    } catch (err) {
      console.error(err);
      setError('Error searching for games. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleGameSelect = (game: any) => {
    setSelectedGame({
      rawgGameId: game.id,
      title: game.name,
      coverImage: game.background_image,
      platforms: game.platforms?.map((p: any) => p.platform.name) || [],
      genres: game.genres?.map((g: any) => g.name) || [],
      status: 'wishlist',
    });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <p style={{
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem'
        }}>
          Game Vault
        </p>
        <h1 style={{
          fontFamily: "'Unbounded', sans-serif",
          fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
          fontWeight: 900, lineHeight: 1, marginBottom: '2rem'
        }}>
          Find Games
        </h1>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{
          display: 'flex', gap: '0',
          maxWidth: '600px', margin: '0 auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: '14px',
          overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '0 1rem', color: 'var(--text-muted)'
          }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, genre, studio..."
            style={{
              flex: 1, border: 'none', borderRadius: 0,
              padding: '0.9rem 0', fontSize: '1rem',
              background: 'transparent',
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ borderRadius: '0 13px 13px 0', padding: '0.9rem 1.5rem', flexShrink: 0 }}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <p style={{ color: 'var(--accent)', textAlign: 'center', marginBottom: '1.5rem' }}>{error}</p>
      )}

      {results.length > 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-primary)', fontWeight: 500 }}>
            {results.length}
          </span>{' '}
          results for &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Results grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {results.map(game => (
          <SearchResultCard
            key={game.id}
            game={game}
            onSelect={() => handleGameSelect(game)}
          />
        ))}
      </div>

      {selectedGame && (
        <LibraryEntryModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onUpdated={() => {
            setSelectedGame(null);
          }}
        />
      )}
    </div>
  );
};

const SearchResultCard = ({ game, onSelect }: { game: any; onSelect: () => void }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio: '3/4',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.5)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Cover image */}
      {game.background_image && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${game.background_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'transform 0.3s',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
        }} />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(7,7,12,0.97) 0%, rgba(7,7,12,0.5) 40%, rgba(7,7,12,0.1) 70%)',
      }} />

      {/* Add button on hover */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <span style={{
            background: 'var(--accent)',
            color: '#fff',
            padding: '0.4rem 1.1rem',
            borderRadius: '100px',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}>
            Add to Library
          </span>
        </div>
      )}

      {/* Content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem', zIndex: 1 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.3, marginBottom: '0.25rem' }}>
          {game.name}
        </h3>
        {game.released && (
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.72rem', color: 'var(--text-muted)'
          }}>
            {game.released.substring(0, 4)}
          </span>
        )}
      </div>
    </div>
  );
};
