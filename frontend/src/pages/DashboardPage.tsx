import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Gamepad2 } from 'lucide-react';
import { LibraryAPI } from '../services/api';
import { GameCard } from '../components/GameCard';
import { LibraryEntryModal } from '../components/LibraryEntryModal';
import { AIRecommendationsWidget } from '../components/AIRecommendationsWidget';

const StatCard = ({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  delay: string;
}) => (
  <div style={{
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderTopWidth: '2px',
    borderTopColor: color,
    borderRadius: '14px',
    padding: '1.5rem',
    animation: `fadeInUp 0.4s ease-out ${delay} both`,
  }}>
    <p style={{
      fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem'
    }}>
      {label}
    </p>
    <p style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: '3rem', fontWeight: 500,
      lineHeight: 1, color,
    }}>
      {value}
    </p>
  </div>
);

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
      setRecentGames(libraryRes.data.entries.slice(0, 6));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ color: 'var(--text-muted)' }}>
        Loading vault...
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page header */}
      <div style={{ marginBottom: '2.5rem' }}>
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
            Dashboard
          </h1>
          <Link to="/search" className="btn-primary">
            <Plus size={15} />
            Add Games
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '1rem',
        marginBottom: '3.5rem'
      }}>
        <StatCard label="Total Games"      value={stats?.total ?? 0}            color="var(--text-primary)"     delay="0.05s" />
        <StatCard label="Playing"          value={stats?.playing ?? 0}          color="var(--status-playing)"   delay="0.1s"  />
        <StatCard label="Completed"        value={stats?.completed ?? 0}        color="var(--status-completed)" delay="0.15s" />
        <StatCard label="Hours Played"     value={stats?.totalHoursPlayed ?? 0} color="var(--accent-amber)"     delay="0.2s"  />
      </div>

      {/* AI Recommendations */}
      <AIRecommendationsWidget
        userStats={{
          topGenres: stats?.topGenres ?? [],
          recentGames: recentGames.map((g: any) => g.title),
          totalCompleted: stats?.completed ?? 0,
        }}
        onGameSelect={(game) => setSelectedGame(game)}
      />

      {/* Recently Added */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem'
        }}>
          <div>
            <p style={{
              fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem'
            }}>
              Recently Added
            </p>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Your Collection</h2>
          </div>
          <Link to="/library" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
            View All
          </Link>
        </div>

        {recentGames.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-strong)',
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
          }}>
            <Gamepad2
              size={40}
              style={{ color: 'var(--text-faint)', margin: '0 auto 1rem', display: 'block' }}
            />
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Your vault is empty — let's fill it up.
            </p>
            <Link to="/search" className="btn-primary">Find Games</Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))',
            gap: '1rem'
          }}>
            {recentGames.map(game => (
              <GameCard key={game._id} game={game} onClick={() => setSelectedGame(game)} />
            ))}
          </div>
        )}
      </div>

      {selectedGame && (
        <LibraryEntryModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onUpdated={() => { fetchDashboardData(); setSelectedGame(null); }}
        />
      )}
    </div>
  );
};
