import { create } from "zustand";
import { getAccessToken, getProfileAuth } from "@/lib/auth-cookies";

interface AuthState {
  accessToken: string | null;
  profile: any | null;
  isAuthenticated: boolean;

  setAuth: (token: string, profile: any) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: getAccessToken(),
  profile: getProfileAuth(),
  isAuthenticated: !!getAccessToken(),

  setAuth: (token, profile) =>
    set({
      accessToken: token,
      profile,
      isAuthenticated: true,
    }),

  clearAuth: () =>
    set({
      accessToken: null,
      profile: null,
      isAuthenticated: false,
    }),
}));
