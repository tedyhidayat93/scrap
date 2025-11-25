import Cookies from "js-cookie";
import type { LoginResponse } from "@/interfaces/auth";
import { ProfileAuth } from "@/interfaces/profile";

export const saveToken = (data: LoginResponse): void => {
  try {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    Cookies.set("access_token", data.access_token, {
      expires,
      secure: true,
      sameSite: "strict",
    });

    Cookies.set("refresh_token", data.refresh_token, {
      expires,
      secure: true,
      sameSite: "strict",
    });

    const accessExpiresAtMs = Date.now() + (data.expires_in || 0) * 1000;
    if (data.expires_in) {
      Cookies.set("access_token_expires_at", String(accessExpiresAtMs), {
        expires,
        secure: true,
        sameSite: "strict",
      });
    }
  } catch (error) {
    console.error("Failed to save tokens", error);
  }
};

export const saveProfile = (data: ProfileAuth) => {
  try {
    const expires = new Date(Date.now() + 30 * 60 * 1000);

    Cookies.set("profile", JSON.stringify(data), {
      expires,
      secure: true,
      sameSite: "strict",
    });
  } catch (error) {
    console.error("Failed to save profile", error);
  }
};

export const getAccessToken = (): string => {
  return Cookies.get("access_token") || "";
};

export const getRefreshToken = (): string => {
  return Cookies.get("refresh_token") || "";
};

export const getAccessTokenExpiryMs = (): number | null => {
  const v = Cookies.get("access_token_expires_at");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const getProfileAuth = (): ProfileAuth | null => {
  try {
    const profile = Cookies.get("profile");
    return profile ? JSON.parse(profile) : null;
  } catch (error) {
    console.error("Failed to parse profile cookie", error);
    return null;
  }
};

export const clearAuthCookies = (): void => {
  const cookieNames = ["access_token", "refresh_token", "profile"];

  cookieNames.forEach((name) => {
    Cookies.remove(name, {
      secure: true,
      sameSite: "strict",
    });

    Cookies.remove(name, { path: "/" });
    Cookies.remove(name);
  });
};
