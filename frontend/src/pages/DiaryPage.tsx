import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock } from 'lucide-react';
import { LibraryAPI } from '../services/api';

interface DiaryEntry {
  key: string;
  rawgGameId: number | string;
  title: string;
  coverImage?: string;
  text?: string;
  rating?: number;
  hoursPlayed?: number;
  createdAt: string;
}

const flattenDiary = (entries: any[]): DiaryEntry[] => {
  const logs: DiaryEntry[] = [];
  entries.forEach(entry => {
    (entry.reviewLogs || []).forEach((log: any, idx: number) => {
      logs.push({
        key: `${entry._id}-${log._id ?? idx}`,
        rawgGameId: entry.rawgGameId,
        title: entry.title,
        coverImage: entry.coverImage,
        text: log.text,
        rating: log.rating,
        hoursPlayed: log.hoursPlayed,
        createdAt: log.createdAt,
      });
    });
  });
  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const DiaryPage = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    LibraryAPI.getGames('all')
      .then(res => setEntries(flattenDiary(res.data.entries || [])))
      .catch(() => setError('No se pudo cargar el diario.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="page-container" style={{ color: 'var(--text-muted)' }}>Cargando diario...</div>;
  }

  if (error) {
    return <div className="page-container" style={{ color: 'var(--text-muted)' }}>{error}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: '640px' }}>
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border-strong)',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          Todavía no has escrito ninguna reseña.{' '}
          <Link to="/library" style={{ color: 'var(--accent)' }}>Ve a tu librería.</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem',
        }}>
          Mi diario
        </p>
        <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900 }}>
          Línea de tiempo
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {entries.map(entry => (
          <div
            key={entry.key}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              gap: '1rem',
            }}
          >
            {entry.coverImage && (
              <img
                src={entry.coverImage}
                alt={entry.title}
                style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginBottom: '0.25rem' }}>
                {new Date(entry.createdAt).toLocaleDateString()}
              </p>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>{entry.title}</h3>
              {entry.text && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{entry.text}</p>
              )}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                {typeof entry.rating === 'number' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={12} /> {entry.rating}/10
                  </span>
                )}
                {typeof entry.hoursPlayed === 'number' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {entry.hoursPlayed}h
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
