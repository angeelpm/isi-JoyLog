import React, { useState } from 'react';

interface GameCardProps {
  game: any;
  onClick?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  playing:   'var(--status-playing)',
  completed: 'var(--status-completed)',
  dropped:   'var(--status-dropped)',
  wishlist:  'var(--status-wishlist)',
  backlog:   'var(--status-backlog)',
};

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const statusColor = STATUS_COLORS[game.status] || 'var(--border)';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        aspectRatio: '3/4',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.55)' : '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
      }}
    >
      {/* Status stripe at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '3px', background: statusColor, zIndex: 2,
      }} />

      {/* Cover image */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${game.coverImage || ''})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        transition: 'transform 0.3s ease',
      }} />

      {/* Gradient overlay — darker on hover for readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: hovered
          ? 'linear-gradient(to top, rgba(7,7,12,0.99) 0%, rgba(7,7,12,0.6) 45%, rgba(7,7,12,0.15) 75%)'
          : 'linear-gradient(to top, rgba(7,7,12,0.96) 0%, rgba(7,7,12,0.4) 40%, transparent 70%)',
        transition: 'background 0.22s',
      }} />

      {/* Bottom content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.85rem', zIndex: 1 }}>
        <h3 style={{
          fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.3,
          marginBottom: '0.3rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {game.title}
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: statusColor,
          }}>
            {game.status}
          </span>
          {game.rating && (
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.75rem', color: 'var(--accent-amber)',
            }}>
              ★ {game.rating}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
