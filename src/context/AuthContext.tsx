import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ACCESS_TOKEN_KEY, TOKEN_TYPE_KEY, withAuthorization } from '../lib/auth';

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

  const apiBaseUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    try {
      const baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const authHeaders = withAuthorization() as Record<string, string>;
      const headers = { ...baseHeaders, ...authHeaders };

      const res = await fetch(`${apiBaseUrl}/users/me`, {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        console.warn('Failed to fetch current user', res.status);
        return;
      }
      const json = await res.json();
      setUser(json as User);
    } catch (e) {
      console.warn('Error fetching current user', e);
    }
  };

  const login = async (name: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: name,
          password: password,
        }),
      });

      if (!response.ok) {
        throw new Error('Credenciales incorrectas');
      }

      const data = await response.json();
      if (data?.access_token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
        setAccessToken(data.access_token);
      }
      if (data?.token_type) {
        localStorage.setItem(TOKEN_TYPE_KEY, data.token_type);
      }
      await fetchCurrentUser();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchCurrentUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = async ({ name, email, password }: { name: string; email: string; password: string }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";
      const payload = { name, email, password, role_id: 2 };

      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || 'Error al registrar usuario');
      }

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
