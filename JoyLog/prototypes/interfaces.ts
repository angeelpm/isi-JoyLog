// ====================================================
// JoyLog – Interfaces y Estructuras de Datos
// Sprint 2 – Definición de tipos TypeScript
// ====================================================

// -------------------- USER --------------------
export interface User {
  _id: string;
  username: string;
  email: string;
  password: string;           // Hasheada con bcrypt
  avatar: string;             // URL de imagen
  bio: string;
  following: string[];        // IDs de usuarios seguidos
  followers: string[];        // IDs de seguidores
  badges: Badge[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublicProfile {
  _id: string;
  username: string;
  avatar: string;
  bio: string;
  badges: Badge[];
  stats: UserStats;
  createdAt: Date;
}

export interface UserStats {
  totalGames: number;
  totalHoursPlayed: number;
  completedGames: number;
  completionRate: number;     // Porcentaje 0-100
  averageRating: number;
  topGenres: { genre: string; count: number }[];
  topPlatforms: { platform: string; count: number }[];
}

// -------------------- GAME ENTRY --------------------
// Un juego en la biblioteca personal del usuario
export type GameStatus = 'playing' | 'completed' | 'pending' | 'abandoned' | '100%';
export type Platform = 'PC' | 'PS5' | 'PS4' | 'Xbox Series' | 'Xbox One' | 'Switch' | 'Mobile' | 'Other';

export interface GameEntry {
  _id: string;
  userId: string;             // Referencia al User
  rawgId: number;             // ID del juego en RAWG API
  title: string;
  coverImage: string;         // URL de la portada
  platform: Platform;
  status: GameStatus;
  hoursPlayed: number;
  personalRating: number | null;  // 1-10
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Request para crear/actualizar entrada
export interface GameEntryCreateRequest {
  rawgId: number;
  title: string;
  coverImage: string;
  platform: Platform;
  status: GameStatus;
  hoursPlayed?: number;
  personalRating?: number;
  startDate?: string;
  endDate?: string;
}

export interface GameEntryUpdateRequest {
  platform?: Platform;
  status?: GameStatus;
  hoursPlayed?: number;
  personalRating?: number;
  startDate?: string;
  endDate?: string;
}

// -------------------- GAME (RAWG Cache) --------------------
// Ficha de juego cacheada de RAWG API
export interface Game {
  _id: string;
  rawgId: number;
  title: string;
  slug: string;
  description: string;
  coverImage: string;         // background_image de RAWG
  genres: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
  metacritic: number | null;
  releaseDate: string;
  screenshots: string[];
  esrbRating: string | null;
  website: string | null;
  cachedAt: Date;             // Para invalidar caché
}

// Resultado de búsqueda simplificado
export interface GameSearchResult {
  rawgId: number;
  title: string;
  coverImage: string;
  platforms: string[];
  metacritic: number | null;
  releaseDate: string;
  genres: string[];
}

// -------------------- REVIEW --------------------
export interface Review {
  _id: string;
  userId: string;             // Referencia al User
  username: string;           // Desnormalizado para mostrar
  userAvatar: string;
  rawgId: number;             // ID del juego
  gameTitle: string;
  title: string;              // Título de la reseña
  content: string;            // Texto de la reseña
  rating: number;             // 1-10
  likes: string[];            // IDs de usuarios que dieron like
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewCreateRequest {
  rawgId: number;
  gameTitle: string;
  title: string;
  content: string;
  rating: number;
}

// -------------------- DEALS (IsThereAnyDeal) --------------------
export interface Deal {
  shop: string;               // Nombre de la tienda (Steam, GOG, etc.)
  price: number;              // Precio actual
  regularPrice: number;       // Precio original
  discount: number;           // Porcentaje de descuento
  url: string;                // Enlace a la tienda
  currency: string;
}

export interface GameDeals {
  rawgId: number;
  gameTitle: string;
  deals: Deal[];
  lowestPrice: {
    price: number;
    shop: string;
    date: string;
  } | null;
}

// -------------------- BADGE / ACHIEVEMENT --------------------
export interface Badge {
  id: string;
  name: string;               // e.g., "Primer Paso", "Centurión"
  description: string;        // e.g., "Completa tu primer juego"
  icon: string;               // Emoji o URL de icono
  unlockedAt: Date | null;
}

// Definición de logros del sistema
export const BADGES: Omit<Badge, 'unlockedAt'>[] = [
  { id: 'first_game',      name: 'Primer Paso',       description: 'Añade tu primer juego a la biblioteca',     icon: '🎮' },
  { id: 'first_complete',   name: 'Fin del Tutorial',   description: 'Completa tu primer juego',                  icon: '✅' },
  { id: 'first_review',     name: 'Crítico Novato',     description: 'Escribe tu primera reseña',                icon: '✍️' },
  { id: 'ten_games',        name: 'Coleccionista',      description: 'Añade 10 juegos a tu biblioteca',          icon: '📚' },
  { id: 'ten_complete',     name: 'Dedicado',           description: 'Completa 10 juegos',                       icon: '🏆' },
  { id: 'fifty_complete',   name: 'Veterano',           description: 'Completa 50 juegos',                       icon: '⭐' },
  { id: 'hundred_complete', name: 'Centurión',          description: 'Completa 100 juegos',                      icon: '💯' },
  { id: 'hundred_percent',  name: 'Perfeccionista',     description: 'Marca un juego como 100%',                 icon: '💎' },
  { id: 'first_follow',     name: 'Social',             description: 'Sigue a tu primer usuario',                icon: '👥' },
  { id: 'hundred_hours',    name: 'Maratonista',        description: 'Acumula 100 horas jugadas en total',       icon: '⏱️' },
];

// -------------------- AUTH --------------------
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    _id: string;
    username: string;
    email: string;
    avatar: string;
  };
}

// -------------------- API RESPONSES --------------------
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// -------------------- FILTERS --------------------
export interface LibraryFilters {
  status?: GameStatus;
  platform?: Platform;
  genre?: string;
  minHours?: number;
  maxHours?: number;
  sortBy?: 'title' | 'rating' | 'hoursPlayed' | 'createdAt' | 'endDate';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
