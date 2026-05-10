import { useState, useEffect } from 'react';
import { LibraryAPI } from '../services/api';
import { GameCard } from '../components/GameCard';
import { LibraryEntryModal } from '../components/LibraryEntryModal';

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

  useEffect(() => {
    fetchLibrary();
  }, [statusFilter]);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>My Library</h1>
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: 'var(--bg-card)', color: 'white', border: '1px solid var(--border-color)' }}
        >
          <option value="all">All Games</option>
          <option value="playing">Playing</option>
          <option value="completed">Completed</option>
          <option value="dropped">Dropped</option>
          <option value="wishlist">Wishlist</option>
        </select>
      </div>

      {loading ? (
        <div>Loading library...</div>
      ) : games.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No games found for this status.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {games.map(game => (
            <GameCard key={game._id} game={game} onClick={() => setSelectedGame(game)} />
          ))}
        </div>
      )}

      {selectedGame && (
        <LibraryEntryModal 
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onUpdated={() => {
            fetchLibrary();
            setSelectedGame(null);
          }}
        />
      )}
    </div>
  );
};
