import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ACCESS_TOKEN_KEY, TOKEN_TYPE_KEY } from '../lib/auth';
import { api } from '../lib/api';

export interface User {
  id: number;
  name: string;
  email: string;
  language?: string;
  role_id?: number;
  available?: boolean;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (name: string, password: string) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (name: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{ access_token: string; token_type: string }>(
        '/auth/login',
        new URLSearchParams({
          username: name,
          password: password,
        })
      );

      if (data?.access_token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
        setAccessToken(data.access_token);
      }
      if (data?.token_type) {
        localStorage.setItem(TOKEN_TYPE_KEY, data.token_type);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return;
      try {
        const json = await api.get<User>('/users/me');
        setUser(json as User);
      } catch (e) {
        console.warn('Error fetching current user', e);
      }
    };

    if (accessToken) {
      fetchCurrentUser();
    }
  }, [accessToken]);

  const register = async ({ name, email, password }: { name: string; email: string; password: string }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const payload = { name, email, password, role_id: 2 };

      await api.post('/auth/register', payload);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar usuario');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(TOKEN_TYPE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, register, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
