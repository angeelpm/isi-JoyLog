import axios from 'axios';

// Vite environment variables are prefixed with VITE_
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Generic service helpers
export const AuthAPI = {
  getProfile: () => api.get('/api/auth/me'),
  updateProfile: (data: any) => api.put('/api/auth/me', data),
};

export const LibraryAPI = {
  getGames: (status = 'all') => api.get(`/api/library?status=${status}`),
  addGame: (data: any) => api.post('/api/library', data),
  updateGame: (id: string, data: any) => api.put(`/api/library/${id}`, data),
  deleteGame: (id: string) => api.delete(`/api/library/${id}`),
  getStats: () => api.get('/api/library/stats'),
  getGameReviews: (rawgGameId: number | string) => api.get(`/api/library/reviews/${rawgGameId}`),
  getEntryByRawgId: (rawgGameId: number | string) => api.get(`/api/library/by-rawg/${rawgGameId}`),
};

export const RawgAPI = {
  searchGames: (query: string, genre?: string, page: number = 1) => {
    const url = `/api/games/games?`;
    const params = [];
    if (query) params.push(`search=${encodeURIComponent(query)}`);
    if (genre) params.push(`genres=${encodeURIComponent(genre)}`);
    params.push(`page=${page}`);
    return api.get(url + params.join('&'));
  },
  getGameDetails: (id: string) => api.get(`/api/games/games/${id}`),
};

export const PriceAPI = {
  getGamePrice: (title: string) => api.get('/api/library/prices', { params: { title } }),
};

export interface PublicUser {
  _id: string;
  username: string;
  avatarUrl?: string;
}

export const SocialAPI = {
  getPublicProfile: (username: string) => api.get(`/api/auth/users/${username}`),
  follow: (userId: string) => api.post(`/api/auth/users/${userId}/follow`),
  unfollow: (userId: string) => api.delete(`/api/auth/users/${userId}/follow`),
  getFollowers: (userId: string) => api.get(`/api/auth/users/${userId}/followers`),
  getFollowing: (userId: string) => api.get(`/api/auth/users/${userId}/following`),
  getPublicStats: (userId: string) => api.get(`/api/library/stats/public/${userId}`),
  likeReview: (gameEntryId: string, reviewLogId: string) => api.post('/api/library/likes', { gameEntryId, reviewLogId }),
  unlikeReview: (reviewLogId: string) => api.delete(`/api/library/likes/${reviewLogId}`),
  getCommonGames: (otherUserId: string) => api.get(`/api/library/common/${otherUserId}`),
  searchUsers: (q: string) => api.get<{ users: PublicUser[] }>('/api/auth/users/search', { params: { q } }),
};

export interface FavoriteGame {
  rawgGameId: number | string;
  title: string;
  coverImage?: string;
}

export interface GameListCollaborator {
  userId: string;
  username: string;
}

export interface GameList {
  _id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  ownerId: string;
  ownerUsername?: string;
  collaborators: GameListCollaborator[];
  games: { rawgGameId: number | string; title: string; coverImage?: string }[];
}

export const ListAPI = {
  create: (data: { title: string; description?: string; isPublic: boolean }) =>
    api.post<{ list: GameList }>('/api/library/lists', data),
  getMine: () => api.get<{ lists: GameList[] }>('/api/library/lists/mine'),
  getByUser: (userId: string) => api.get<{ lists: GameList[] }>(`/api/library/lists/user/${userId}`),
  getOne: (listId: string) => api.get<{ list: GameList }>(`/api/library/lists/${listId}`),
  update: (listId: string, data: Partial<{ title: string; description: string; isPublic: boolean }>) =>
    api.put<{ list: GameList }>(`/api/library/lists/${listId}`, data),
  remove: (listId: string) => api.delete(`/api/library/lists/${listId}`),
  addGame: (listId: string, game: { rawgGameId: number | string; title: string; coverImage?: string }) =>
    api.post<{ list: GameList }>(`/api/library/lists/${listId}/games`, game),
  removeGame: (listId: string, rawgGameId: number | string) =>
    api.delete<{ list: GameList }>(`/api/library/lists/${listId}/games/${rawgGameId}`),
  addCollaborator: (listId: string, userId: string, username: string) =>
    api.post<{ list: GameList }>(`/api/library/lists/${listId}/collaborators`, { userId, username }),
  removeCollaborator: (listId: string, userId: string) =>
    api.delete<{ list: GameList }>(`/api/library/lists/${listId}/collaborators/${userId}`),
};

export interface FeedItem {
  username: string;
  rawgGameId: number | string;
  title: string;
  coverImage?: string;
  type: 'review' | 'completed';
  text?: string;
  rating?: number;
  createdAt: string;
  gameEntryId: string;
  reviewLogId?: string;
  likeCount?: number;
  isLikedByMe?: boolean;
  commentCount?: number;
}

export const FeedAPI = {
  getFeed: (userIds: string[], page = 1) =>
    api.get<{ items: FeedItem[]; page: number; hasMore: boolean }>('/api/library/feed', {
      params: { userIds: userIds.join(','), page },
    }),
};

export const CommentAPI = {
  getComments: (reviewLogId: string) => api.get(`/api/library/comments/${reviewLogId}`),
  addComment: (gameEntryId: string, reviewLogId: string, text: string) =>
    api.post('/api/library/comments', { gameEntryId, reviewLogId, text }),
  deleteComment: (commentId: string) => api.delete(`/api/library/comments/${commentId}`),
};

export const AiAPI = {
  getRecommendations: (payload: {
    mode: 'theme' | 'library';
    theme?: string;
    userStats?: { topGenres?: string[]; recentGames?: string[]; totalCompleted?: number };
  }) => api.post('/api/ai/recommendations', payload),
};
