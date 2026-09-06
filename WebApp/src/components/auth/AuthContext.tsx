"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  UserProfile,
  AuthState,
  LoginPayload,
  RegisterPayload,
  getStoredAuth,
  saveStoredAuth,
  clearStoredAuth,
  loginUser,
  registerUser,
} from "@/lib/integrations/authClient";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateUserRole: (role: "patient" | "caregiver") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    refreshToken: null,
    user: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hydrate state from localStorage on client mount
    try {
      const stored = getStoredAuth();
      if (stored.token || stored.user) {
        setAuthState(stored);
      }
    } catch (err) {
      console.error("Failed to restore auth session:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const res = await loginUser(payload);
      setAuthState(res);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const res = await registerUser(payload);
      setAuthState(res);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredAuth();
    setAuthState({
      token: null,
      refreshToken: null,
      user: null,
    });
  };

  const handleUpdateUserRole = (role: "patient" | "caregiver") => {
    if (!authState.user) return;
    const updatedUser: UserProfile = { ...authState.user, role };
    const updatedState: AuthState = { ...authState, user: updatedUser };
    setAuthState(updatedState);
    saveStoredAuth(updatedState);
  };

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        token: authState.token,
        isAuthenticated: !!authState.token,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        updateUserRole: handleUpdateUserRole,
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
