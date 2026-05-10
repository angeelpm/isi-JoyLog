import { useState, useEffect } from 'react';
import { LibraryAPI, RawgAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface LibraryEntryModalProps {
  game: any;
  onClose: () => void;
  onUpdated: () => void;
}

export const LibraryEntryModal: React.FC<LibraryEntryModalProps> = ({ game, onClose, onUpdated }) => {
  const { user } = useAuth();
  
  const [status, setStatus] = useState(game.status || 'wishlist');
  const [rating, setRating] = useState(game.rating || '');
  const [hoursPlayed, setHoursPlayed] = useState(game.hoursPlayed || 0);

  // Instead of a single review, we have a list + a new review text area
  const [reviewLogs, setReviewLogs] = useState<any[]>(game.reviewLogs || []);
  const [newReviewText, setNewReviewText] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [gameDetails, setGameDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

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
    if (game.rawgGameId) fetchDetails();
  }, [game.rawgGameId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedLogs = [...reviewLogs];
      if (newReviewText.trim()) {
        updatedLogs.push({
          text: newReviewText,
          rating: rating === '' ? undefined : Number(rating),
          hoursPlayed: Number(hoursPlayed),
          createdAt: new Date().toISOString()
        });
      }

      const payload = {
        status,
        rating: rating === '' ? undefined : Number(rating),
        hoursPlayed: Number(hoursPlayed),
        reviewLogs: updatedLogs
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
          ...payload
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

  const handleDelete = async () => {
    if (!game._id){
      onClose();
      return;
    }
    const yes = window.confirm('Are you sure you want to remove this game from your library?');
    if (!yes)return;
    setDeleting(true);
    try {
      await LibraryAPI.deleteGame(game._id);
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to drop entry');
    } finally {
      setDeleting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        const ratingVal = Number(rating) || 0;
        const fill = ratingVal >= i * 2 ? 100 : (ratingVal >= i * 2 - 1 ? 50 : 0);
        stars.push(
            <span key={i} style={{ 
                cursor: 'pointer', 
                fontSize: '2rem', 
                color: fill > 0 ? 'var(--accent-orange)' : 'var(--border-color)',
                position: 'relative',
                display: 'inline-block'
            }} onClick={() => setRating(String(i * 2))}>
                ★
            </span>
        );
    }
    return <div style={{ display: 'flex', gap: '5px' }}>{stars}</div>;
  };

  const renderStaticStars = (val: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        const fill = val >= i * 2 ? 100 : (val >= i * 2 - 1 ? 50 : 0);
        stars.push(
            <span key={i} style={{ 
                fontSize: '1rem', 
                color: fill > 0 ? 'var(--accent-orange)' : 'var(--border-color)'
            }}>
                ★
            </span>
        );
    }
    return <div style={{ display: 'flex', gap: '2px' }}>{stars}</div>;
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)',
      padding: '2rem',
      overflowY: 'auto'
    }}>
      <div className="glass-card" style={{
        maxWidth: '1000px', width: '100%',
        backgroundColor: 'var(--bg-dark)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        maxHeight: '90vh'
      }}>
        
        {/* Backdrop Header */}
        {gameDetails?.background_image && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '350px',
            backgroundImage: `url(${gameDetails.background_image})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.15, zIndex: 0,
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
          }} />
        )}

        {/* Close Button */}
        <button onClick={onClose} style={{ 
            position: 'absolute', top: '15px', right: '20px', 
            background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '40px', height: '40px',
            border: '1px solid var(--border-color)', color: 'white', fontSize: '1.5rem', 
            cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>×</button>

        <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', zIndex: 1, padding: '3rem', flexWrap: 'wrap', overflowY: 'auto' }}>
            
            {/* LEFT COLUMN: Poster and Form Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: '1 1 250px', maxWidth: '300px' }}>
                <img 
                    src={game.coverImage || 'https://via.placeholder.com/250x350?text=No+Cover'} 
                    alt={game.title} 
                    style={{ width: '100%', borderRadius: '12px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)', objectFit: 'cover', aspectRatio: '3/4' }}
                />

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px' }}>
                            <option value="playing">Currently Playing</option>
                            <option value="completed">Completed</option>
                            <option value="dropped">Dropped</option>
                            <option value="wishlist">Wishlist</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Rating (/10)</label>
                        <input type="number" min="1" max="10" value={rating} onChange={(e) => setRating(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px' }} placeholder="e.g. 8" />
                        <div style={{ marginTop: '0.5rem' }}>{renderStars()}</div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Hours Played</label>
                        <input type="number" min="0" value={hoursPlayed} onChange={(e) => setHoursPlayed(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px' }} />
                    </div>

                    <button type="submit" className="btn-primary" style={{ padding: '1rem', marginTop: '0.5rem', borderRadius: '6px' }} disabled={saving}>
                        {saving ? 'Saving...' : 'Save & Update'}
                    </button>
                    
                    <button type="button" onClick={handleDelete} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '0.5rem', textDecoration: 'underline' }} disabled={deleting}>
                        {deleting ? 'Removing...' : (game._id ? 'Remove from library' : 'Cancel')}
                    </button>
                </form>
            </div>

            {/* RIGHT COLUMN: Game Info and Reviews Log */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: '3 1 400px' }}>
                
                <div>
                    <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', lineHeight: 1.2, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{game.title}</h1>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {game.genres?.map((g: string) => (
                            <span key={g} style={{ backgroundColor: 'var(--border-color)', padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', color: 'var(--text-main)' }}>{g}</span>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '1.05rem', paddingRight: '1rem' }}>
                        {loadingDetails ? (
                            <span style={{ opacity: 0.5 }}>Loading synopsis...</span>
                        ) : gameDetails?.description_raw ? (
                            <p>{gameDetails.description_raw}</p>
                        ) : (
                            <span style={{ fontStyle: 'italic' }}>No description available.</span>
                        )}
                    </div>

                    {/* REVIEWS LOG SECTION */}
                    <div style={{ marginTop: '1rem' }}>
                        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 500 }}>
                            Review Logs
                        </h3>
                        
                        {/* List of existing logs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: reviewLogs.length > 0 ? '1.5rem' : '0' }}>
                            {reviewLogs.map((log: any, idx: number) => (
                                <div key={idx} style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <strong style={{ color: 'var(--accent-blue)' }}>{user?.username || 'You'}</strong>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                • {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Previous Log'}
                                            </span>
                                            {log.hoursPlayed !== undefined && (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                    • {log.hoursPlayed}h played
                                                </span>
                                            )}
                                        </div>
                                        {log.rating > 0 && renderStaticStars(log.rating)}
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>{log.text}</p>
                                </div>
                            ))}
                            
                            {/* Migrated legacy review if any */}
                            {game.review && reviewLogs.length === 0 && (
                                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <strong style={{ color: 'var(--accent-blue)' }}>{user?.username || 'You'}</strong>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>• Heritage Log</span>
                                            {game.hoursPlayed !== undefined && (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                    • {game.hoursPlayed}h played
                                                </span>
                                            )}
                                        </div>
                                        {game.rating > 0 && renderStaticStars(game.rating)}
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>{game.review}</p>
                                </div>
                            )}
                        </div>

                        {/* New Review Entry box */}
                        <div style={{ marginTop: '0.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Log a new review...</label>
                            <textarea 
                                value={newReviewText} 
                                onChange={(e) => setNewReviewText(e.target.value)} 
                                rows={4} 
                                style={{ 
                                    width: '100%', padding: '1rem', borderRadius: '8px', 
                                    backgroundColor: 'var(--bg-dark)', color: 'white', 
                                    border: '1px solid var(--border-color)', resize: 'vertical',
                                    fontSize: '1rem', lineHeight: 1.5, fontFamily: 'inherit'
                                }} 
                                placeholder="Write your thoughts about this playthrough..." 
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Saving will attach your current rating, hours played, and the current date to this entry.
                            </p>
                        </div>

                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};
