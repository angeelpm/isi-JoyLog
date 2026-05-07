import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LibraryAPI } from '../services/api';
import { GameCard } from '../components/GameCard';
import { LibraryEntryModal } from '../components/LibraryEntryModal';

export const DashboardPage = () => {
  const [stats, setStats] = useState<any>(null);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, libraryRes] = await Promise.all([
        LibraryAPI.getStats(),
        LibraryAPI.getGames('all')
      ]);
      
      setStats(statsRes.data.stats);
      setRecentGames(libraryRes.data.entries.slice(0, 4)); // Get 4 most recent
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <div className="page-container">Loading dashboard...</div>;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--accent-green)' }}>Your Dashboard</h1>
        <Link to="/search" className="btn-primary">Find More Games</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{stats?.total || 0}</div>
          <div style={{ color: 'var(--text-muted)' }}>Total Games</div>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>{stats?.playing || 0}</div>
          <div style={{ color: 'var(--text-muted)' }}>Currently Playing</div>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-orange)' }}>{stats?.completed || 0}</div>
          <div style={{ color: 'var(--text-muted)' }}>Completed</div>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats?.totalHoursPlayed || 0}</div>
          <div style={{ color: 'var(--text-muted)' }}>Hours Played</div>
        </div>
      </div>

      <h2>Recently Added</h2>
      {recentGames.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', marginTop: '1rem', color: 'var(--text-muted)' }}>
          Your library is empty. Let's find some games!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {recentGames.map(game => (
            <GameCard key={game._id} game={game} onClick={() => setSelectedGame(game)} />
          ))}
        </div>
      )}

      {selectedGame && (
        <LibraryEntryModal 
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onUpdated={() => {
            fetchDashboardData();
            setSelectedGame(null);
          }}
        />
      )}
    </div>
  );
};
