import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Ctx, type AuthState, type User } from "./AuthContext"; 

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const me = await api.get("/auth/me");

        setUser({
          id: me.data.id,
          email: me.data.email,
          name: me.data.userName,
          phoneNumber: me.data.phoneNumber ?? null,
          roles: me.data.roles ?? [],
        });
      } catch {
        localStorage.removeItem("accessToken");
        delete api.defaults.headers.common["Authorization"];
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login: AuthState["login"] = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const token = res.data.accessToken as string;

    localStorage.setItem("accessToken", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const me = await api.get("/auth/me");
    setUser({
      id: me.data.id,
      email: me.data.email,
      name: me.data.userName,
      phoneNumber: me.data.phoneNumber ?? null,
      roles: me.data.roles ?? [],
    });
  };

  const register: AuthState["register"] = async ({
    userName,
    email,
    password,
    phoneNumber,
  }) => {
    await api.post("/auth/register", {
      userName,
      email,
      password,
      phoneNumber: phoneNumber ?? null,
    });
    //await login(email, password); - ако реша, да се логва автоматично след регистрация
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isLoading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>; 
}
