import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ensureStockmateUser } from '../services/userSession';

type UserSessionValue = {
  userId: string | null;
  email: string | null;
  ready: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

const UserSessionContext = createContext<UserSessionValue | undefined>(undefined);

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const u = await ensureStockmateUser();
      setUserId(u.id);
      setEmail(u.email);
    } catch (e) {
      setUserId(null);
      setEmail(null);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ userId, email, ready, error, refresh }),
    [userId, email, ready, error, refresh]
  );

  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>;
}

export function useUserSession(): UserSessionValue {
  const ctx = useContext(UserSessionContext);
  if (!ctx) {
    throw new Error('useUserSession must be used within UserSessionProvider');
  }
  return ctx;
}
