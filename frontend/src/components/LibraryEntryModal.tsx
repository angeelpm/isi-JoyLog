import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { LibraryAPI, RawgAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PriceWidget } from './PriceWidget';

interface LibraryEntryModalProps {
  game: any;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS = [
  { value: 'playing',   label: 'Currently Playing', color: 'var(--status-playing)' },
  { value: 'completed', label: 'Completed',          color: 'var(--status-completed)' },
  { value: 'backlog',   label: 'Backlog',             color: 'var(--status-backlog)' },
  { value: 'wishlist',  label: 'Wishlist',            color: 'var(--status-wishlist)' },
  { value: 'dropped',   label: 'Dropped',             color: 'var(--status-dropped)' },
];

export const LibraryEntryModal: React.FC<LibraryEntryModalProps> = ({ game, onClose, onUpdated }) => {
  const { user } = useAuth();

  const [status, setStatus]           = useState(game.status || 'wishlist');
  const [rating, setRating]           = useState(game.rating || '');
  const [hoursPlayed, setHoursPlayed] = useState(game.hoursPlayed || 0);
  const [reviewLogs, setReviewLogs]   = useState<any[]>(game.reviewLogs || []);
  const [newReviewText, setNewReviewText] = useState('');
  const [saving, setSaving]           = useState(false);
  const [addingLog, setAddingLog]     = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [hasAddedLog, setHasAddedLog] = useState(false);
  const [gameDetails, setGameDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [communityReviews, setCommunityReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data } = await RawgAPI.getGameDetails(game.rawgGameId.toString());
        setGameDetails(data);
      } catch (err) {
        console.error('Failed to fetch RAWG details', err);
      } finally {
        setLoadingDetails(false);
      }
    };
    const fetchReviews = async () => {
      try {
        const { data } = await LibraryAPI.getGameReviews(game.rawgGameId);
        setCommunityReviews(data.reviews || []);
      } catch (err) {
        console.error('Failed to fetch community reviews', err);
      }
    };
    if (game.rawgGameId) {
      fetchDetails();
      fetchReviews();
    } else {
      setLoadingDetails(false);
    }
  }, [game.rawgGameId]);

  // Saves only the library metadata (status, rating, hours) — no review
  const handleSaveLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        status,
        rating: rating === '' ? undefined : Number(rating),
        hoursPlayed: Number(hoursPlayed),
      };
      if (game._id) {
        await LibraryAPI.updateGame(game._id, payload);
      } else {
        await LibraryAPI.addGame({
          rawgGameId: game.rawgGameId,
          title: game.title,
          coverImage: game.coverImage,
          platforms: game.platforms || [],
          genres: game.genres || [],
          ...payload,
        });
      }
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      alert(game._id ? 'Failed to update game entry' : 'Failed to add game entry');
    } finally {
      setSaving(false);
    }
  };

  // Appends a new review log without touching library metadata
  const handleAddLog = async () => {
    if (!newReviewText.trim() || !game._id) return;
    setAddingLog(true);
    try {
      const newLog = {
        text: newReviewText.trim(),
        rating: rating === '' ? undefined : Number(rating),
        hoursPlayed: Number(hoursPlayed),
        createdAt: new Date().toISOString(),
      };
      const updatedLogs = [...reviewLogs, newLog];
      await LibraryAPI.updateGame(game._id, { reviewLogs: updatedLogs });
      setReviewLogs(updatedLogs);
      setNewReviewText('');
      setHasAddedLog(true);
    } catch (err) {
      console.error(err);
      alert('Failed to add log');
    } finally {
      setAddingLog(false);
    }
  };

  const handleDelete = async () => {
    if (!game._id) { onClose(); return; }
    if (!window.confirm('Remove this game from your library?')) return;
    setDeleting(true);
    try {
      await LibraryAPI.deleteGame(game._id);
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to remove entry');
    } finally {
      setDeleting(false);
    }
  };

  const renderStars = () => Array.from({ length: 5 }, (_, i) => {
    const idx = i + 1;
    const ratingVal = Number(rating) || 0;
    const filled = ratingVal >= idx * 2;
    return (
      <span
        key={idx}
        onClick={() => setRating(String(idx * 2))}
        style={{
          cursor: 'pointer',
          fontSize: '1.65rem',
          color: filled ? 'var(--accent-amber)' : 'rgba(255,255,255,0.12)',
          transition: 'color 0.15s',
        }}
      >
        ★
      </span>
    );
  });

  const renderStaticStars = (val: number) => Array.from({ length: 5 }, (_, i) => {
    const idx = i + 1;
    const filled = val >= idx * 2;
    return (
      <span key={idx} style={{ fontSize: '0.9rem', color: filled ? 'var(--accent-amber)' : 'rgba(255,255,255,0.12)' }}>
        ★
      </span>
    );
  });

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === status);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) { if (hasAddedLog) { onUpdated(); } else { onClose(); } } }}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(12px)',
        padding: '1.5rem',
        overflowY: 'auto',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div style={{
        maxWidth: '960px', width: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: '20px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        overflow: 'hidden',
        maxHeight: '92vh',
        animation: 'fadeInUp 0.25s ease-out',
      }}>

        {/* Background image bleed */}
        {gameDetails?.background_image && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '320px',
            backgroundImage: `url(${gameDetails.background_image})`,
            backgroundSize: 'cover', backgroundPosition: 'center top',
            opacity: 0.12, zIndex: 0,
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          }} />
        )}

        {/* Close button */}
        <button
          onClick={() => { if (hasAddedLog) { onUpdated(); } else { onClose(); } }}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid var(--border)',
            borderRadius: '50%',
            width: '36px', height: '36px',
            color: 'var(--text-muted)',
            cursor: 'pointer', zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,59,92,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          <X size={16} />
        </button>

        {/* Body */}
        <div style={{
          display: 'flex', flexDirection: 'row', gap: '2rem',
          padding: '2.5rem',
          flexWrap: 'wrap',
          overflowY: 'auto',
          position: 'relative', zIndex: 1,
        }}>

          {/* ── LEFT: poster + library form ─────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: '0 0 240px', maxWidth: '240px' }}>
            <img
              src={game.coverImage || ''}
              alt={game.title}
              style={{
                width: '100%', borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                objectFit: 'cover', aspectRatio: '3/4',
              }}
            />

            <form onSubmit={handleSaveLibrary} style={{
              display: 'flex', flexDirection: 'column', gap: '1.25rem',
              background: 'var(--bg-surface-2)',
              padding: '1.25rem', borderRadius: '12px',
              border: '1px solid var(--border)',
            }}>
              {/* Status */}
              <div>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Status</p>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ width: '100%', color: currentStatusOption?.color || 'var(--text-primary)' }}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Rating */}
              <div>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Rating</p>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '0.5rem' }}>
                  {renderStars()}
                </div>
                <input
                  type="number" min="1" max="10" value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="1 – 10"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              {/* Hours */}
              <div>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Hours Played</p>
                <input
                  type="number" min="0" value={hoursPlayed}
                  onChange={(e) => setHoursPlayed(e.target.value)}
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '10px' }}
                disabled={saving}
              >
                {saving ? 'Saving…' : (game._id ? 'Save Changes' : 'Add to Library')}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: 'transparent', color: 'var(--text-muted)',
                  border: 'none', padding: '0.25rem', fontSize: '0.8rem',
                  textDecoration: 'underline', cursor: 'pointer',
                }}
              >
                {deleting ? 'Removing…' : (game._id ? 'Remove from library' : 'Cancel')}
              </button>
            </form>

            <PriceWidget title={game.title} autoFetch />
          </div>

          {/* ── RIGHT: info + logs ──────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: '1 1 380px', minWidth: 0 }}>

            {/* Title + genres */}
            <div>
              <h1 style={{
                fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
                fontWeight: 700, lineHeight: 1.15,
                marginBottom: '0.75rem',
              }}>
                {game.title}
              </h1>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {game.genres?.map((g: string) => (
                  <span key={g} style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid var(--border)',
                    padding: '0.15rem 0.65rem',
                    borderRadius: '100px',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                  }}>
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            <div style={{
              color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem',
              maxHeight: '140px', overflowY: 'auto',
            }}>
              {loadingDetails ? (
                <span style={{ opacity: 0.5 }}>Loading synopsis…</span>
              ) : gameDetails?.description_raw ? (
                <p>{gameDetails.description_raw.slice(0, 500)}{gameDetails.description_raw.length > 500 ? '…' : ''}</p>
              ) : (
                <span style={{ fontStyle: 'italic' }}>No description available.</span>
              )}
            </div>

            {/* Review logs */}
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border)',
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Review Logs</h3>
                {reviewLogs.length > 0 && (
                  <span style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '100px',
                    padding: '0.1rem 0.55rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontFamily: "'DM Mono', monospace",
                  }}>
                    {reviewLogs.length}
                  </span>
                )}
              </div>

              {/* Existing logs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {reviewLogs.map((log: any, idx: number) => (
                  <div key={idx} style={{
                    padding: '1rem 1.1rem',
                    background: 'var(--bg-surface-2)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-violet)' }}>{user?.username || 'You'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>·</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Previous log'}
                        </span>
                        {log.hoursPlayed !== undefined && (
                          <>
                            <span style={{ color: 'var(--text-muted)' }}>·</span>
                            <span style={{ color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                              {log.hoursPlayed}h
                            </span>
                          </>
                        )}
                      </div>
                      {log.rating > 0 && <div style={{ display: 'flex', gap: '2px' }}>{renderStaticStars(log.rating)}</div>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{log.text}</p>
                  </div>
                ))}

                {/* Legacy review */}
                {game.review && reviewLogs.length === 0 && (
                  <div style={{
                    padding: '1rem 1.1rem',
                    background: 'var(--bg-surface-2)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-violet)', fontSize: '0.82rem' }}>{user?.username || 'You'}</span>
                      {game.rating > 0 && <div style={{ display: 'flex', gap: '2px' }}>{renderStaticStars(game.rating)}</div>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{game.review}</p>
                  </div>
                )}
              </div>

              {/* Community Reviews Section */}
              {communityReviews.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    marginBottom: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Community Reviews</h3>
                    <span style={{
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '100px',
                      padding: '0.1rem 0.55rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {communityReviews.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    {communityReviews.map((log: any, idx: number) => (
                      <div key={'comm-'+idx} style={{
                        padding: '1rem 1.1rem',
                        background: 'var(--bg-surface-2)',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                            <Link to={`/u/${log.username}`} style={{ fontWeight: 700, color: 'var(--accent-violet)', textDecoration: 'none' }}>
                              {log.username}
                            </Link>
                            <span style={{ color: 'var(--text-muted)' }}>·</span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Unknown date'}
                            </span>
                            {log.hoursPlayed > 0 && (
                              <>
                                <span style={{ color: 'var(--text-muted)' }}>·</span>
                                <span style={{ color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                                  {log.hoursPlayed}h
                                </span>
                              </>
                            )}
                          </div>
                          {log.rating > 0 && <div style={{ display: 'flex', gap: '2px' }}>{renderStaticStars(log.rating)}</div>}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{log.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New review entry */}
              <div>
                <p style={{
                  fontSize: '0.68rem', fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--text-muted)', marginBottom: '0.5rem'
                }}>
                  Log a new entry
                </p>

                {!game._id ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Add the game to your library first to log a review.
                  </p>
                ) : (
                  <>
                    <textarea
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      rows={3}
                      placeholder="Write your thoughts about this playthrough…"
                      style={{
                        width: '100%',
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '10px',
                        padding: '0.85rem 1rem',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', margin: 0 }}>
                        Current rating + hours will be attached to this log.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddLog}
                        disabled={addingLog || !newReviewText.trim()}
                        className="btn-primary"
                        style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', flexShrink: 0 }}
                      >
                        {addingLog ? 'Adding…' : 'Add Log'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};