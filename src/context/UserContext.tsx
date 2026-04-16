import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authAPI } from '../api/auth';
import { usersAPI } from '../api/users';
import { set401Handler } from '../api/client';

export interface AuthUser {
  id: string;

  uuid?: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  gender?: string;
  university?: string;
  department?: string;
  address?: string;
  avatar?: string;
  rating?: number;
  totalRides?: number;
}

interface UserContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

const normalizeAuthUser = (raw: any): AuthUser | null => {
  if (!raw) return null;

  const resolvedId = raw.id ?? raw.user_id;
  if (resolvedId === undefined || resolvedId === null) return null;

  return {
    id: String(resolvedId),
    uuid: raw.uuid ?? raw.user_uuid,
    name: raw.name ?? '',
    username: raw.username ?? '',
    email: raw.email ?? '',
    phone: raw.phone,
    gender: raw.gender,
    university: raw.university,
    department: raw.department,
    address: raw.address,
    avatar: raw.avatar ?? raw.avatar_url,
    rating: raw.rating ?? raw.avg_rating,
    totalRides: raw.totalRides ?? raw.total_rides,
  };
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore session from SecureStore
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await authAPI.getStoredToken();
        if (storedToken) {
          setToken(storedToken);
          const userData = await authAPI.getCurrentUser();
          setUser(normalizeAuthUser(userData));
        }
      } catch {
        // Token expired or invalid - clear it
        await authAPI.logout();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Set up 401 handler - called when API returns Unauthorized
  useEffect(() => {
    const handle401 = async () => {
      console.log('🔐 401 Unauthorized - clearing session');
      await authAPI.logout();
      setUser(null);
      setToken(null);
      // Navigation will be handled by RootLayoutNav based on auth state
    };

    set401Handler(handle401);

    // Cleanup: remove handler on unmount (though UserProvider typically doesn't unmount)
    return () => {
      set401Handler(() => {});
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: newToken } = await authAPI.login(email, password);
    setToken(newToken);
    const userData = await usersAPI.getCurrentUser();
    setUser(normalizeAuthUser(userData));
  }, []);

  const logout = useCallback(async () => {
    await authAPI.logout();
    setUser(null);
    setToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await usersAPI.getCurrentUser();
      setUser(normalizeAuthUser(userData));
    } catch {
      // Silently fail on refresh
    }
  }, []);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: !!user, isLoading, login, logout, refreshUser }),
    [user, token, isLoading, login, logout, refreshUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
