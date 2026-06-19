// ==============================
// JoyLog - Shared Type Definitions
// ==============================

// --- Game Status ---
export type GameStatus = 'playing' | 'completed' | 'backlog' | 'dropped' | 'wishlist';

// --- User ---
export interface IUser {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  favoriteGames?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// --- Game Entry (User's library item) ---
export interface IGameEntry {
  id: string;
  userId: string;
  rawgGameId: number;
  title: string;
  coverImage: string;
  status: GameStatus;
  rating?: number;        // 1-10
  review?: string;
  hoursPlayed?: number;
  platforms?: string[];
  genres?: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// --- Game (from RAWG API) ---
export interface IGame {
  id: number;
  name: string;
  slug: string;
  background_image: string;
  rating: number;
  rating_top: number;
  ratings_count: number;
  released: string;
  metacritic: number | null;
  genres: { id: number; name: string; slug: string }[];
  platforms: { platform: { id: number; name: string; slug: string } }[];
  short_screenshots?: { id: number; image: string }[];
  description_raw?: string;
}

// --- API Responses ---
export interface IAuthResponse {
  message: string;
  token: string;
  user: IUser;
}

export interface ILibraryStats {
  total: number;
  playing: number;
  completed: number;
  backlog: number;
  dropped: number;
  wishlist: number;
  totalHoursPlayed: number;
  avgRating?: number;
}

// --- Social: Community Review Item ---
export interface ICommunityReview {
  username: string;
  text: string;
  rating?: number;
  hoursPlayed?: number;
  createdAt?: string;
  isCurrentUser: boolean;
  reviewLogId?: string;
  likeCount?: number;
  isLikedByMe?: boolean;
}

// --- Social: Like ---
export interface ILike {
  id: string;
  likerId: string;
  gameEntryId: string;
  reviewLogId: string;
  createdAt: string;
}

// --- Social: Public Profile ---
export interface IPublicProfile {
  _id: string;
  username: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

// --- Social: Follow Entry ---
export interface IFollowEntry {
  _id: string;
  username: string;
}

// --- GameEntry input (for create/update) ---
export interface IGameEntryInput {
  rawgGameId: number;
  title: string;
  coverImage: string;
  status: GameStatus;
  rating?: number;
  review?: string;
  hoursPlayed?: number;
  platforms?: string[];
  genres?: string[];
}
