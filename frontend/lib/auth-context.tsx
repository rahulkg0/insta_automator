"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, AuthResponse } from "@/types";
import { apiRequest } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  signup: (data: { email: string; full_name: string; password: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { full_name?: string; email?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const userData = await apiRequest<User>("/api/v1/users/me", {}, authToken);
      setUser(userData);
    } catch (error: any) {
      // Cleanly invalidate stored token without throwing dev overlay errors
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };


  const login = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const authRes = await apiRequest<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      localStorage.setItem("token", authRes.access_token);
      setToken(authRes.access_token);
      setUser(authRes.user);
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: { email: string; full_name: string; password: string }) => {
    setIsLoading(true);
    try {
      const authRes = await apiRequest<AuthResponse>("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });
      localStorage.setItem("token", authRes.access_token);
      setToken(authRes.access_token);
      setUser(authRes.user);
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const updateProfile = async (data: { full_name?: string; email?: string }) => {
    if (!token) return;
    const updatedUser = await apiRequest<User>(
      "/api/v1/users/me",
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      token
    );
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
