import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface AdminAuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
  retryAfterSeconds: number | null;
  login: (credentials: { username?: string; password?: string; secretKey?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
}


async function getCsrfToken(): Promise<string> {
  const res = await fetch('/api/admin/csrf', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  const data = await res.json();
  if (!res.ok || !data?.success || typeof data?.data?.csrfToken !== 'string') throw new Error('Unable to initialize CSRF protection.');
  return data.data.csrfToken;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);

  /**
   * Validate session with server using HttpOnly cookie transport
   */
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/auth/session', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data.authenticated) {
          setIsAuthenticated(true);
          setUsername(data.data.username || null);
          setExpiresAt(data.data.expiresAt || null);
          setIsLoading(false);
          return true;
        }
      }

      // If server returns unauthorized or invalid session
      setUsername(null);
      setExpiresAt(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    } catch {
      setUsername(null);
      setExpiresAt(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Authenticate admin. Server issues HttpOnly cookie upon success.
   */
  const login = async (credentials: { username?: string; password?: string; secretKey?: string }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setRetryAfterSeconds(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const newUsername = data.data.username || credentials.username || 'admin';
        const newExpiresAt = data.data.expiresAt || null;

        setUsername(newUsername);
        setExpiresAt(newExpiresAt);
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      } else {
        const errorMsg = data.error?.message || 'Authentication failed.';
        setError(errorMsg);
        if (data.error?.retryAfterSeconds) {
          setRetryAfterSeconds(data.error.retryAfterSeconds);
        }
        setIsAuthenticated(false);
        setIsLoading(false);
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Network error during authentication.');
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Terminate session on server and clear local state
   */
  const logout = async () => {
    try {
      const csrfToken = await getCsrfToken();
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
    } catch {
      // Ignore network failures on logout
    }

    setUsername(null);
    setExpiresAt(null);
    setIsAuthenticated(false);
    setError(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        username,
        expiresAt,
        isLoading,
        error,
        retryAfterSeconds,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
