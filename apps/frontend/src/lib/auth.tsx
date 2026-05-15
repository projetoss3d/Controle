"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PARTNER" | "COLLABORATOR" | "VIEWER";
}

export interface AuthTenant {
  id: string;
  slug: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  tenant: AuthTenant | null;
  ready: boolean;
}

interface AuthContextValue extends AuthState {
  login: (input: { tenantSlug: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "controle.auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    tenant: null,
    ready: false,
  });

  // Hidrata do localStorage no primeiro render (apenas no client).
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Omit<AuthState, "ready">;
        setState({ ...parsed, ready: true });
        return;
      }
    } catch {
      /* ignore */
    }
    setState((s) => ({ ...s, ready: true }));
  }, []);

  const login = useCallback(
    async (input: { tenantSlug: string; email: string; password: string }) => {
      const r = await api<{ token: string; user: AuthUser; tenant: AuthTenant }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      const next: AuthState = { token: r.token, user: r.user, tenant: r.tenant, ready: true };
      setState(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token: next.token, user: next.user, tenant: next.tenant }),
        );
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setState({ token: null, user: null, tenant: null, ready: true });
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Redireciona para /login se não autenticado. */
export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();

  useEffect(() => {
    if (auth.ready && !auth.token && pathname !== "/login") {
      router.replace("/login");
    }
  }, [auth.ready, auth.token, pathname, router]);

  return auth;
}
