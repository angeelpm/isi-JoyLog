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
};

export const RawgAPI = {
  searchGames: (query: string) => api.get(`/api/games/games?search=${encodeURIComponent(query)}`),
  getGameDetails: (id: string) => api.get(`/api/games/games/${id}`),
};
