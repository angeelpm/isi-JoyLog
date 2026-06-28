import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Gamepad2, UserCircle2 } from 'lucide-react';
import { RawgAPI, SocialAPI, LibraryAPI } from '../services/api';
import type { PublicUser } from '../services/api';
import { LibraryEntryModal } from '../components/LibraryEntryModal';
import { PriceWidget } from '../components/PriceWidget';

type SearchType = 'games' | 'players';

const COMMON_GENRES = [
  { slug: '', name: 'All Genres' },
  { slug: 'action', name: 'Action' },
  { slug: 'shooter', name: 'Shooter' },
  { slug: 'adventure', name: 'Adventure' },
  { slug: 'role-playing-games-rpg', name: 'RPG' },
  { slug: 'strategy', name: 'Strategy' },
  { slug: 'sports', name: 'Sports' },
  { slug: 'racing', name: 'Racing' },
  { slug: 'puzzle', name: 'Puzzle' },
  { slug: 'fighting', name: 'Fighting' },
];

const SearchTypeToggle = ({ value, onChange }: { value: SearchType; onChange: (t: SearchType) => void }) => (
  <div style={{
    display: 'inline-flex',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-strong)',
    borderRadius: '12px',
    padding: '4px',
    gap: '4px',
    marginBottom: '1.5rem',
  }}>
    {([
      { type: 'games' as const, label: 'Juegos', icon: Gamepad2 },
      { type: 'players' as const, label: 'Jugadores', icon: UserCircle2 },
    ]).map(({ type, label, icon: Icon }) => (
      <button
        key={type}
        type="button"
        onClick={() => onChange(type)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.55rem 1.15rem',
          borderRadius: '9px',
          border: 'none',
          cursor: 'pointer',
          background: value === type ? 'var(--accent)' : 'transparent',
          color: value === type ? '#fff' : 'var(--text-muted)',
          fontWeight: 600,
          fontSize: '0.85rem',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <Icon size={15} />
        {label}
      </button>
    ))}
  </div>
);

export const SearchPage = () => {
  const [searchType, setSearchType] = useState<SearchType>('games');

  // ── Games search state ──────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [submittedGenre, setSubmittedGenre] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState<any>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Players search state ────────────────────────────────────────────
  const [playerQuery, setPlayerQuery] = useState('');
  const [playerResults, setPlayerResults] = useState<PublicUser[]>([]);
  const [playerSearching, setPlayerSearching] = useState(false);
  const [playerSearched, setPlayerSearched] = useState(false);
  const [playerError, setPlayerError] = useState('');

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const handleGameSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !genre) return;
    setLoading(true);
    setError('');
    setPage(1);
    try {
      const response = await RawgAPI.searchGames(query, genre, 1);
      setResults(response.data.results);
      setHasMore(!!response.data.next);
      setSubmittedQuery(query);
      setSubmittedGenre(genre);
    } catch (err) {
      console.error(err);
      setError('Error searching for games. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (page === 1) return;

    const loadMore = async () => {
      setLoadingMore(true);
      try {
        const response = await RawgAPI.searchGames(query, genre, page);
        setResults(prev => [...prev, ...response.data.results]);
        setHasMore(!!response.data.next);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMore(false);
      }
    };

    loadMore();
  }, [page]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handlePlayerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerQuery.trim()) return;
    setPlayerSearching(true);
    setPlayerError('');
    try {
      const res = await SocialAPI.searchUsers(playerQuery.trim());
      setPlayerResults(res.data.users || []);
      setPlayerSearched(true);
    } catch (err) {
      console.error('Failed to search players', err);
      setPlayerError('No se pudo buscar jugadores. Inténtalo de nuevo.');
    } finally {
      setPlayerSearching(false);
    }
  };

  const handleGameSelect = async (game: any) => {
    const baseGame = {
      rawgGameId: game.id,
      title: game.name,
      coverImage: game.background_image,
      platforms: game.platforms?.map((p: any) => p.platform.name) || [],
      genres: game.genres?.map((g: any) => g.name) || [],
      status: 'wishlist',
    };
    try {
      const { data } = await LibraryAPI.getEntryByRawgId(game.id);
      setSelectedGame(data.entry ? { ...baseGame, ...data.entry, _id: data.entry._id } : baseGame);
    } catch (err) {
      console.error('Failed to fetch existing library entry', err);
      setSelectedGame(baseGame);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <p style={{
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem'
        }}>
          Discover
        </p>
        <h1 style={{
          fontFamily: "'Unbounded', sans-serif",
          fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
          fontWeight: 900, lineHeight: 1, marginBottom: '1.5rem'
        }}>
          {searchType === 'games' ? 'Find Games' : 'Encuentra jugadores'}
        </h1>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SearchTypeToggle value={searchType} onChange={setSearchType} />
        </div>

        {searchType === 'games' ? (
          <form onSubmit={handleGameSearch} style={{
            display: 'flex', gap: '0',
            maxWidth: '800px', margin: '0 auto',
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
              placeholder="Search by title, studio..."
              style={{
                flex: 1, border: 'none', borderRadius: 0,
                padding: '0.9rem 0', fontSize: '1rem',
                background: 'transparent',
                minWidth: '150px'
              }}
            />
            <div style={{ width: '1px', background: 'var(--border-strong)', margin: '0.5rem 0' }}></div>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              style={{
                border: 'none', background: 'transparent',
                padding: '0 1rem', fontSize: '0.95rem',
                color: 'var(--text-primary)', outline: 'none',
                cursor: 'pointer'
              }}
            >
              {COMMON_GENRES.map(g => (
                <option key={g.slug} value={g.slug} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ borderRadius: '0 13px 13px 0', padding: '0.9rem 1.5rem', flexShrink: 0 }}
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePlayerSearch} style={{
            display: 'flex', gap: '0',
            maxWidth: '500px', margin: '0 auto',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '0 1rem', color: 'var(--text-muted)'
            }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              value={playerQuery}
              onChange={(e) => setPlayerQuery(e.target.value)}
              placeholder="Buscar por nombre de usuario..."
              style={{
                flex: 1, border: 'none', borderRadius: 0,
                padding: '0.9rem 0', fontSize: '1rem',
                background: 'transparent',
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={playerSearching}
              style={{ borderRadius: '0 13px 13px 0', padding: '0.9rem 1.5rem', flexShrink: 0 }}
            >
              {playerSearching ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
        )}
      </div>

      {searchType === 'games' ? (
        <>
          {error && (
            <p style={{ color: 'var(--accent)', textAlign: 'center', marginBottom: '1.5rem' }}>{error}</p>
          )}

          {results.length > 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-primary)', fontWeight: 500 }}>
                {results.length}
              </span>{' '}
              results {submittedQuery ? `for "${submittedQuery}"` : ''} {submittedGenre ? `in ${COMMON_GENRES.find(g => g.slug === submittedGenre)?.name}` : ''}
            </p>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {results.map((game, index) => {
              if (results.length === index + 1) {
                return (
                  <div ref={lastElementRef} key={`${game.id}-${index}`}>
                    <SearchResultCard game={game} onSelect={() => handleGameSelect(game)} />
                  </div>
                );
              } else {
                return <SearchResultCard key={`${game.id}-${index}`} game={game} onSelect={() => handleGameSelect(game)} />;
              }
            })}
          </div>

          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              Loading more games...
            </div>
          )}

          {selectedGame && (
            <LibraryEntryModal
              game={selectedGame}
              onClose={() => setSelectedGame(null)}
              onUpdated={() => {
                setSelectedGame(null);
              }}
            />
          )}
        </>
      ) : (
        <>
          {playerError && (
            <p style={{ color: 'var(--accent)', textAlign: 'center', marginBottom: '1.5rem' }}>{playerError}</p>
          )}

          {playerSearched && !playerSearching && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px', margin: '0 auto' }}>
              {playerResults.length === 0 ? (
                <p style={{ color: 'var(--text-faint)', textAlign: 'center' }}>No se encontraron jugadores con ese nombre.</p>
              ) : (
                playerResults.map(player => (
                  <Link
                    key={player._id}
                    to={`/u/${player.username}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.85rem',
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      borderRadius: '12px', padding: '0.85rem 1.1rem',
                      textDecoration: 'none', color: 'inherit',
                    }}
                  >
                    <UserCircle2 size={28} color="var(--text-muted)" />
                    <span style={{ fontWeight: 600 }}>{player.username}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </>
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

      {/* Price widget — direct child at zIndex 3, above the hover overlay (zIndex 2) */}
      <div
        style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', zIndex: 3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <PriceWidget title={game.name} compact />
      </div>
    </div>
  );
};
