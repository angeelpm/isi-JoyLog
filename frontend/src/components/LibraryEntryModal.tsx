import { useState } from 'react';
import { LibraryAPI } from '../services/api';

interface LibraryEntryModalProps {
  game: any;
  onClose: () => void;
  onUpdated: () => void;
}

export const LibraryEntryModal: React.FC<LibraryEntryModalProps> = ({ game, onClose, onUpdated }) => {
  const [status, setStatus] = useState(game.status || 'backlog');
  const [rating, setRating] = useState(game.rating || '');
  const [review, setReview] = useState(game.review || '');
  const [hoursPlayed, setHoursPlayed] = useState(game.hoursPlayed || 0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await LibraryAPI.updateGame(game._id, {
        status,
        rating: rating === '' ? undefined : Number(rating),
        review,
        hoursPlayed: Number(hoursPlayed)
      });
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update game entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove this game from your library?')) return;
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

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-card" style={{
        maxWidth: '500px', width: '100%',
        backgroundColor: 'var(--bg-card)',
        padding: '2rem',
        borderRadius: '12px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)' }}>
              <option value="playing">Currently Playing</option>
              <option value="completed">Completed</option>
              <option value="backlog">Backlog</option>
              <option value="dropped">Dropped</option>
              <option value="wishlist">Wishlist</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Rating (/10)</label>
              <input type="number" min="1" max="10" value={rating} onChange={(e) => setRating(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Hours Played</label>
              <input type="number" min="0" value={hoursPlayed} onChange={(e) => setHoursPlayed(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Review (Optional)</label>
            <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={4} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', resize: 'vertical' }} placeholder="What did you think of the game?..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <button type="button" onClick={handleDelete} className="btn-secondary" style={{ backgroundColor: 'transparent', color: 'var(--accent-red)', border: '1px solid var(--accent-red)' }} disabled={deleting}>
              {deleting ? 'Removing...' : 'Remove from Library'}
            </button>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--accent-green)' }} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
