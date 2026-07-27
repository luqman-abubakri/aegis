"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserType } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("aegis_token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query currentUser {
              currentUser {
                id
                name
                email
                createdAt
                updatedAt
              }
            }
          `,
        }),
      });

      const json = await res.json();

      if (json.errors) {
        localStorage.removeItem("aegis_token");
        setUser(null);
      } else if (json.data?.currentUser) {
        setUser(json.data.currentUser);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        setLoading(true);

        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              mutation login($input: LoginInput!) {
                login(input: $input) {
                  success
                  message
                  token
                  user {
                    id
                    name
                    email
                    createdAt
                    updatedAt
                  }
                }
              }
            `,
            variables: { input: { email, password } },
          }),
        });

        const json = await res.json();

        if (json.errors) {
          throw new Error(json.errors[0].message);
        }

        const data = json.data?.login;

        if (!data?.success) {
          throw new Error(data?.message || "Login failed");
        }

        localStorage.setItem("aegis_token", data.token);
        setUser(data.user);
        router.push("/dashboard");

        return { success: true };
      } catch (err: any) {
        setError(err.message);
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        setError(null);
        setLoading(true);

        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              mutation register($input: RegisterInput!) {
                register(input: $input) {
                  success
                  message
                  token
                  user {
                    id
                    name
                    email
                    createdAt
                    updatedAt
                  }
                }
              }
            `,
            variables: { input: { name, email, password } },
          }),
        });

        const json = await res.json();

        if (json.errors) {
          throw new Error(json.errors[0].message);
        }

        const data = json.data?.register;

        if (!data?.success) {
          throw new Error(data?.message || "Registration failed");
        }

        localStorage.setItem("aegis_token", data.token);
        setUser(data.user);
        router.push("/dashboard");

        return { success: true };
      } catch (err: any) {
        setError(err.message);
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("aegis_token");
    setUser(null);
    router.push("/sign-in");
  }, [router]);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    fetchUser,
  };
}

