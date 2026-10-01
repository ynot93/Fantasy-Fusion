import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthUser } from '../types';
import { fantasyApi } from '../services/fantasyApi';
import { setTokenGetter, setUnauthorizedHandler } from '../services/http';

const STORAGE_KEY = 'fantasyFusion.auth';

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function writeStoredAuth(auth: StoredAuth | null) {
  try {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private mode, etc.) — session just won't persist
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth());
  const [isLoading] = useState(false);
  const authRef = useRef(auth);
  authRef.current = auth;

  const logout = useCallback(() => {
    setAuth(null);
    writeStoredAuth(null);
  }, []);

  useEffect(() => {
    setTokenGetter(() => authRef.current?.accessToken ?? null);
    setUnauthorizedHandler(() => logout());
    return () => {
      setTokenGetter(null);
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, refreshToken, user } = await fantasyApi.login(email, password);
    const next: StoredAuth = { accessToken, refreshToken, user };
    setAuth(next);
    writeStoredAuth(next);
    return user;
  }, []);

  const value: AuthContextValue = {
    user: auth?.user ?? null,
    isAuthenticated: !!auth,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
