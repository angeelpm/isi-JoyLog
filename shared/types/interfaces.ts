export interface GameEntry {
  userId: string;
  gameId: string; // ID from RAWG API
  title: string;
  platform?: string;
  status: 'playing' | 'completed' | 'backlog' | 'dropped';
  rating?: number;
  hoursPlayed?: number;
}
