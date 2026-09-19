import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

export type Role = "TRAINEE" | "TRAINER" | "EMPLOYER" | "GOVERNMENT" | "ADMIN";
export type AccountStatus = "ACTIVE" | "PENDING" | "REJECTED" | "SUSPENDED";

export type User = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  account_status: AccountStatus;
  profile_complete: boolean;
  state_code?: string | null;
  district_code?: string | null;
  created_at: string;
};

type AuthResponse = { access_token: string | null; user: User; message?: string | null };
type Credentials = { email: string; password: string };

const AUTH_TOKEN_KEY = "skillalign.auth.token";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (credentials: Credentials) => Promise<void>;
  register: (input: Credentials & { full_name: string; role: Role }) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const token = await storage.secureGet(AUTH_TOKEN_KEY, null);
      if (typeof token === "string") {
        try {
          setUser(await apiRequest<User>("/auth/me", { headers: { Authorization: `Bearer ${token}` } }));
        } catch {
          await storage.secureRemove(AUTH_TOKEN_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (credentials: Credentials) => {
    const result = await apiRequest<AuthResponse>("/auth/login", { method: "POST", body: credentials });
    if (!result.access_token) throw new Error("The server did not return a session token");
    await storage.secureSet(AUTH_TOKEN_KEY, result.access_token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (input: Credentials & { full_name: string; role: Role }) => {
    const result = await apiRequest<AuthResponse>("/auth/register", { method: "POST", body: input });
    if (result.access_token) {
      await storage.secureSet(AUTH_TOKEN_KEY, result.access_token);
      setUser(result.user);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await storage.secureRemove(AUTH_TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, register, signOut }), [loading, register, signIn, signOut, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}