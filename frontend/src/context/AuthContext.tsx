import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import { AuthAPI } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const { data } = await AuthAPI.getProfile();
          setUser(data.user);
        } catch (error) {
          console.error('Error fetching profile', error);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
