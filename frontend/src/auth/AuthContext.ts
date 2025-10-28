import { createContext } from "react";

export type User = {
  id: string;
  email: string;
  name: string;           
  phoneNumber?: string | null;
  roles?: string[];
};

export type RegisterPayload = {
  userName: string;
  email: string;
  password: string;
  phoneNumber?: string | null;
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (p: RegisterPayload) => Promise<void>; 
  logout: () => void;
};

export const Ctx = createContext<AuthState | undefined>(undefined);
