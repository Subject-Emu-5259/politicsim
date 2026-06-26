import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchApi, getToken, setToken, clearToken } from "@/lib/fetchClient";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: { email: string; password: string; displayName: string }) => Promise<{ ok: boolean; error?: string }>;
  registerWithPolitician: (data: {
    email: string; password: string; displayName: string;
    politicianName: string; countryId: string; ideology: string;
    partyId: string | null; homeRegion: string;
  }) => Promise<{ ok: boolean; error?: string; politicianId?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetchApi("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        clearToken();
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetchApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? "Login failed" };
      setToken(data.token);
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, []);

  const register = useCallback(async (data: { email: string; password: string; displayName: string }) => {
    try {
      const res = await fetchApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error ?? "Registration failed" };
      setToken(json.token);
      setUser(json.user);
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, []);

  const registerWithPolitician = useCallback(async (data: {
    email: string; password: string; displayName: string;
    politicianName: string; countryId: string; ideology: string;
    partyId: string | null; homeRegion: string;
  }) => {
    try {
      const res = await fetchApi("/api/auth/register-with-politician", {
        method: "POST",
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error ?? "Registration failed" };
      setToken(json.token);
      setUser(json.user);
      return { ok: true, politicianId: json.politicianId };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, registerWithPolitician, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
