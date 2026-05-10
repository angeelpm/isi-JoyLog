import { useState } from 'react';
import { RawgAPI, LibraryAPI } from '../services/api';
import { LibraryEntryModal } from '../components/LibraryEntryModal';

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState<number | null>(null);
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
      status: 'wishlist' // Default status for new games
    });
  };

  const handleQuickAdd = async (game: any) => {
    setAddingId(game.id);
    try {
      await LibraryAPI.addGame({
        rawgGameId: game.id,
        title: game.name,
        coverImage: game.background_image,
        platforms: game.platforms?.map((p: any) => p.platform.name) || [],
        genres: game.genres?.map((g: any) => g.name) || [],
        status: 'backlog'
      });
      alert(`${game.name} added to your backlog!`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error adding game');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Search Games</h1>
      
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
        <input 
          type="text" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          placeholder="Search for a game..." 
          style={{ flexGrow: 1, padding: '0.75rem', fontSize: '1.1rem' }}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div style={{ color: 'var(--accent-red)', textAlign: 'center' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {results.map(game => (
          <div key={game.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
            <div 
              style={{ 
                width: '100%', 
                height: '150px', 
                backgroundImage: `url(${game.background_image || 'https://via.placeholder.com/300x150'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px',
                marginBottom: '1rem',
                cursor: 'pointer'
              }} 
              onClick={() => handleGameSelect(game)}
            />
            <h3 
              style={{ fontSize: '1.1rem', marginBottom: '0.5rem', flexGrow: 1, cursor: 'pointer' }}
              onClick={() => handleGameSelect(game)}
            >
              {game.name}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{game.released?.substring(0, 4)}</span>
            </div>
          </div>
        ))}
      </div>
      
      {selectedGame && (
        <LibraryEntryModal 
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onUpdated={() => {
            alert(`${selectedGame.title} saved to your library!`);
            setSelectedGame(null);
          }}
        />
      )}
    </div>
  );
};
