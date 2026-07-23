"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  AuthUser,
  login as authLogin,
  register as authRegister,
  guestLogin as authGuestLogin,
  updateUsername as authUpdateUsername,
  getCurrentUser,
  getToken,
  logout as authLogout,
} from "@/services/auth";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string,
  ) => Promise<void>;
  guestLogin: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      getCurrentUser()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authLogin(email, password);
    setUser(response.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, username: string) => {
      const response = await authRegister(email, password, username);
      setUser(response.user);
    },
    [],
  );

  const guestLogin = useCallback(async () => {
    const response = await authGuestLogin();
    setUser(response.user);
  }, []);

  const updateUsername = useCallback(async (username: string) => {
    const updatedUser = await authUpdateUsername(username);
    setUser(updatedUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    authLogout();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isGuest: user?.authProvider === "guest",
        login,
        register,
        guestLogin,
        updateUsername,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
