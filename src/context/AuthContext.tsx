import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ACCESS_TOKEN_KEY, clearAuthTokens, setAuthTokens, setUnauthorizedHandler } from '../lib/auth';
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
      const data = await api.post<{ access_token: string; token_type: string; refresh_token?: string }>(
        '/auth/login',
        new URLSearchParams({
          username: name,
          password: password,
        })
      );

      if (data?.access_token) {
        setAuthTokens({
          accessToken: data.access_token,
          tokenType: data.token_type,
          refreshToken: data.refresh_token,
        });
        setAccessToken(data.access_token);
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
    setUnauthorizedHandler(() => {
      setUser(null);
      setAccessToken(null);
      clearAuthTokens();
      setError('Tu sesión expiró. Volvé a iniciar sesión.');
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

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
    } else {
      // Auto-register y auto-login por defecto
      const autoAuth = async () => {
        const defaultCreds = {
          name: 'prueba',
          email: 'prueba@gmail.com',
          password: 'prueba123456',
        };

        try {
          // Intenta registrar si el usuario aún no existe
          await api.post('/auth/register', { ...defaultCreds, role_id: 2 });
        } catch {
          // Si ya existe u ocurre un error de registro previo, continúa al login
        }

        try {
          // Inicia sesión automáticamente con las credenciales por defecto
          await login(defaultCreds.email, defaultCreds.password);
        } catch (e) {
          console.warn('Error en auto-login:', e);
        }
      };

      void autoAuth();
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
    setError(null);
    clearAuthTokens();
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
