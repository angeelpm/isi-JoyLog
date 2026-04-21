export interface GameEntry {
  id: string;
  title: string;
  status: 'playing' | 'completed' | 'backlog';
  // Add more as needed
}
