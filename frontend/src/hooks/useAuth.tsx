"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getToken, setToken as persistToken } from "@/api/client";
import { login as apiLogin } from "@/api/auth";
import type { User } from "@/types/models";

interface AuthState {
  user: User | null;
  ready: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const USER_KEY = "surakshchain_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const stored = window.localStorage.getItem(USER_KEY);
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        persistToken(null);
      }
    }
    setReady(true);
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const { user: loggedInUser, token } = await apiLogin(phone, password);
    persistToken(token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    persistToken(null);
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
