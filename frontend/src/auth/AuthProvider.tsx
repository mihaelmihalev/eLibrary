import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { AuthContext, type AuthUser } from "./AuthContext";

const TOKEN_KEY = "auth_token";

function setAuthHeader(token?: string) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

function normalizeMe(me: unknown): AuthUser {
  const obj =
    me && typeof me === "object" ? (me as Record<string, unknown>) : {};

  const idRaw = obj["id"];
  const emailRaw = obj["email"];
  const nameRaw =
    obj["userName"] ?? obj["username"] ?? obj["name"] ?? obj["email"];
  const rolesRaw = obj["roles"];

  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.filter((r): r is string => typeof r === "string")
    : [];

  return {
    id:
      typeof idRaw === "string" || typeof idRaw === "number"
        ? String(idRaw)
        : "",
    email: typeof emailRaw === "string" ? emailRaw : "",
    name: typeof nameRaw === "string" ? nameRaw : "",
    roles,
  };
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const me = await api.get("/auth/me");
    setUser(normalizeMe(me.data));
  }, []);

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
        await refreshMe();
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setAuthHeader(undefined);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post("/auth/login", { email, password });
      const token: string =
        res.data?.accessToken ?? res.data?.token ?? res.data;

      localStorage.setItem(TOKEN_KEY, token);
      setAuthHeader(token);

      await refreshMe();
    },
    [refreshMe],
  );

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
        phoneNumber: (args.phoneNumber ?? "").trim(), // ✅ вместо null
      });
    },
    [],
  );

  const value = useMemo(() => {
    const roles = user?.roles ?? [];
    const hasRole = (role: string) => roles.includes(role);

    return {
      user,
      isLoading,

      isAuthenticated: !!user,
      isAdmin: hasRole("Admin"),
      hasRole,

      login,
      logout,
      register,
    };
  }, [user, isLoading, login, logout, register]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
