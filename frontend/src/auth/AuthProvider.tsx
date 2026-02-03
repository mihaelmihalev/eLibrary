import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { AuthContext, type AuthUser } from "./AuthContext";

const TOKEN_KEY = "auth_token";

function setAuthHeader(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setAuthHeader(undefined);
      setUser(null);
      setIsLoading(false);
      return;
    }

    setAuthHeader(token);

    (async () => {
      try {
        const me = await api.get("/auth/me");
        setUser({
          id: me.data.id,
          email: me.data.email,
          name:
            me.data.userName ??
            me.data.username ??
            me.data.name ??
            me.data.email,
          roles: me.data.roles ?? [],
        });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setAuthHeader(undefined);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const token: string =
      res.data?.accessToken ?? res.data?.token ?? res.data;

    localStorage.setItem(TOKEN_KEY, token);
    setAuthHeader(token);

    const me = await api.get("/auth/me");
    setUser({
      id: me.data.id,
      email: me.data.email,
      name:
        me.data.userName ??
        me.data.username ??
        me.data.name ??
        me.data.email,
      roles: me.data.roles ?? [],
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout").catch(() => {});
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setAuthHeader(undefined);
      setUser(null);
    }
  }, []);

  const register = useCallback(
    async (args: {
      userName: string;
      email: string;
      password: string;
      phoneNumber?: string | null;
    }) => {
      await api.post("/auth/register", {
        userName: args.userName,
        email: args.email,
        password: args.password,
        phoneNumber: args.phoneNumber ?? null,
      });
    },
    []
  );

  const value = useMemo(
    () => ({ user, isLoading, login, logout, register }),
    [user, isLoading, login, logout, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
