"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  setAuthenticatedUser: (user: AuthUser) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const authVersionRef = useRef(0);

  const router = useRouter();

  /**
   * Get the currently authenticated user
   * by checking the MongoDB/JWT session.
   */
  const refreshUser = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const requestVersion = ++authVersionRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        setError(null);

        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();

        if (requestVersion !== authVersionRef.current) {
          return;
        }

        if (!response.ok || !data.success) {
          setUser(null);
          return;
        }

        setUser(data.user);
      } catch (err: unknown) {
        if (requestVersion !== authVersionRef.current) {
          return;
        }

        console.error("[Auth] Failed to refresh user:", err);

        setUser(null);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to get authenticated user"
        );
      } finally {
        if (requestVersion === authVersionRef.current) {
          setLoading(false);
        }
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  const setAuthenticatedUser = useCallback((authenticatedUser: AuthUser) => {
    authVersionRef.current += 1;
    setError(null);
    setUser(authenticatedUser);
    setLoading(false);
  }, []);

  /**
   * Log the user out by clearing the
   * MongoDB/JWT session cookie.
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Logout failed");
      }

      setUser(null);

      router.push("/");
    } catch (err: unknown) {
      console.error("[Auth] Logout error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to sign out"
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  /**
   * Check the session when the application starts.
   */
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        setAuthenticatedUser,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}