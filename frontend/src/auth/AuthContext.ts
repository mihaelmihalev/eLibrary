import { createContext } from "react";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  roles?: string[];
};

export type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void> | void;
  register: (args: {
    userName: string;
    email: string;
    password: string;
    phoneNumber?: string | null;
  }) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
