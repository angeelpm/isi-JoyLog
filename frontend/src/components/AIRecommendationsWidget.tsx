import { useState } from 'react';
import { Sparkles, BookOpen, Search, Loader } from 'lucide-react';

interface Recommendation {
  title: string;
  genre: string;
  reason: string;
  price: string;
}

interface AIRecommendationsWidgetProps {
  userStats?: {
    topGenres?: string[];
    recentGames?: string[];
    totalCompleted?: number;
  };
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function fetchRecommendations(prompt: string): Promise<Recommendation[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set');

  const systemPrompt = `You are a video game recommendation AI. ${prompt}
Return ONLY a valid JSON array (no markdown, no explanation) of exactly 5 game recommendations with this exact structure:
[{"title":"...","genre":"...","reason":"...","price":"~€X-Y"}]`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as Recommendation[];
}

export const AIRecommendationsWidget = ({ userStats }: AIRecommendationsWidgetProps) => {
  const [mode, setMode] = useState<'theme' | 'library'>('theme');
  const [themeInput, setThemeInput] = useState('');
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleThemeSearch = async () => {
    if (!themeInput.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const prompt = `Recommend video games based on this theme or mood: "${themeInput}". Consider price value too.`;
      setResults(await fetchRecommendations(prompt));
    } catch {
      setError('Could not get recommendations. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleLibrarySearch = async () => {
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const genres = userStats?.topGenres?.join(', ') || 'action, adventure';
      const recent = userStats?.recentGames?.join(', ') || 'various games';
      const prompt = `The user has completed ${userStats?.totalCompleted ?? 0} games. Their favorite genres are: ${genres}. Recently played: ${recent}. Recommend 5 games they would love, considering price value.`;
      setResults(await fetchRecommendations(prompt));
    } catch {
      setError('Could not get recommendations. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderTopWidth: '2px',
      borderTopColor: 'var(--accent-violet)',
      borderRadius: '14px',
      padding: '1.5rem',
      marginBottom: '3.5rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <Sparkles size={16} color="var(--accent-violet)" />
        <p style={{
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
        }}>
          AI Recommendations
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: '1.25rem',
        background: 'var(--bg-base)', borderRadius: '10px', padding: '4px',
      }}>
        {([
          { key: 'theme', icon: <Search size={13} />, label: 'By theme' },
          { key: 'library', icon: <BookOpen size={13} />, label: 'My library' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => { setMode(tab.key); setResults([]); setError(''); }}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.4rem', padding: '0.5rem',
              background: mode === tab.key ? 'var(--bg-surface)' : 'transparent',
              border: mode === tab.key ? '1px solid var(--border)' : '1px solid transparent',
              borderRadius: '7px', cursor: 'pointer',
              color: mode === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '0.78rem', fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Theme input */}
      {mode === 'theme' && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            value={themeInput}
            onChange={e => setThemeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleThemeSearch()}
            placeholder="e.g. relaxing open world, scary horror short game, cheap RPG..."
            style={{
              flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '0.6rem 0.9rem',
              color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
            }}
          />
          <button
            onClick={handleThemeSearch}
            disabled={loading || !themeInput.trim()}
            className="btn-primary"
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.82rem', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? <Loader size={14} className="spin" /> : 'Ask AI'}
          </button>
        </div>
      )}

      {/* Library mode */}
      {mode === 'library' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            AI will analyze your genres and completed games to suggest what's next.
          </p>
          <button
            onClick={handleLibrarySearch}
            disabled={loading}
            className="btn-primary"
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.82rem', whiteSpace: 'nowrap', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? <Loader size={14} className="spin" /> : 'Recommend me'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ color: 'var(--status-dropped)', fontSize: '0.8rem', marginTop: '1rem' }}>{error}</p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.25rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: '60px', background: 'var(--bg-base)', borderRadius: '8px',
              opacity: 0.6, animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.25rem' }}>
          {results.map((rec, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '0.9rem 1.1rem',
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
                animation: `fadeInUp 0.3s ease-out ${i * 0.07}s both`,
              }}
            >
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: '0.7rem',
                color: 'var(--accent-violet)', minWidth: '1.2rem', paddingTop: '2px',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rec.title}</span>
                  <span style={{
                    fontSize: '0.68rem', color: 'var(--text-muted)',
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: '4px', padding: '1px 6px',
                  }}>
                    {rec.genre}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                  {rec.reason}
                </p>
              </div>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: '0.78rem',
                color: 'var(--status-completed)', whiteSpace: 'nowrap', paddingTop: '2px',
              }}>
                {rec.price}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
