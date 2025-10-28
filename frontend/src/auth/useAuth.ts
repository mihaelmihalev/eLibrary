import { useContext } from "react";
import { Ctx, type AuthState } from "./AuthContext";

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
