import React from 'react';

interface GameCardProps {
  game: any;
  onClick?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  return (
    <div 
      className="glass-card" 
      onClick={onClick}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '0', 
        overflow: 'hidden', 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
    >
      <div style={{ 
        width: '100%', 
        height: '250px', 
        backgroundImage: `url(${game.coverImage || 'https://via.placeholder.com/300x400'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }} />
      <div style={{ padding: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {game.title}
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={`status-${game.status}`} style={{ fontSize: '0.9rem', textTransform: 'capitalize', fontWeight: 'bold' }}>
            {game.status}
          </span>
          {game.rating && (
            <span style={{ backgroundColor: 'var(--bg-dark)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
              ⭐ {game.rating}/10
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
