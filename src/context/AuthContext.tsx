import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "../lib/api";
import type { User } from "../lib/types";

interface RegisterInput {
  username: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/auth")
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<User>("/auth/login", { email, password });
    if (res.token) tokenStore.set(res.token);
    setUser(res.data);
    return res.data;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api.post<User>("/auth/register", input);
    if (res.token) tokenStore.set(res.token);
    setUser(res.data);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const isStaff = (u: User | null) => !!u && u.role !== "client";
export const isAdmin = (u: User | null) => !!u && (u.role === "owner" || u.role === "manager");
