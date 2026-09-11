import { DJANGO_API_URL } from "./config";

export interface UserProfile {
  id?: number | string;
  username: string;
  role: "patient" | "caregiver";
  preferred_language?: string;
  phone_number?: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
}

export interface RegisterPayload {
  username: string;
  password: string;
  role: "patient" | "caregiver";
  preferred_language?: string;
  phone_number?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

const AUTH_STORAGE_KEY = "cogniva_auth_session";

export function getStoredAuth(): AuthState {
  if (typeof window === "undefined") {
    return { token: null, refreshToken: null, user: null };
  }
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { token: null, refreshToken: null, user: null };
    return JSON.parse(raw);
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
}

export function saveStoredAuth(state: AuthState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save auth state to localStorage:", err);
  }
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear auth state:", err);
  }
}

/**
 * Decode standard base64 JWT payload without external libraries
 */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function registerUser(payload: RegisterPayload): Promise<AuthState> {
  let response: Response;
  try {
    response = await fetch(`${DJANGO_API_URL}/register/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    throw new Error(
      `Unable to connect to authentication server at ${DJANGO_API_URL}. Please ensure the backend is running.`
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData
      ? Object.entries(errorData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ")
      : `Registration failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const authState: AuthState = {
    token: data.access,
    refreshToken: data.refresh,
    user: {
      id: data.user?.id,
      username: data.user?.username || payload.username,
      role: data.user?.role || payload.role,
      preferred_language: data.user?.preferred_language || payload.preferred_language || "hi",
      phone_number: data.user?.phone_number || payload.phone_number,
    },
  };

  saveStoredAuth(authState);

  // Reset IRT ability scores so every new account starts at a neutral baseline.
  // This ensures the caregiver dashboard shows clean data, not a previous user's scores.
  try {
    await fetch("/api/irt/reset", { method: "POST" });
  } catch {
    // Non-critical — IRT reset failure should not block registration
  }

  return authState;
}

export async function loginUser(payload: LoginPayload): Promise<AuthState> {
  let response: Response;
  try {
    response = await fetch(`${DJANGO_API_URL}/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    throw new Error(
      `Unable to connect to authentication server at ${DJANGO_API_URL}. Please ensure the backend is running.`
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.non_field_errors?.[0] ||
      `Login failed (${response.status}). Please check your credentials.`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const payloadData = parseJwtPayload(data.access);
  const userId = payloadData?.user_id as number | string | undefined;

  // Derive initial user role if previously saved or infer from username
  const existing = getStoredAuth();
  const inferredRole: "patient" | "caregiver" =
    existing.user?.username === payload.username && existing.user.role
      ? existing.user.role
      : payload.username.toLowerCase().includes("caregiver")
      ? "caregiver"
      : "patient";

  const authState: AuthState = {
    token: data.access,
    refreshToken: data.refresh,
    user: {
      id: userId || existing.user?.id || payload.username,
      username: payload.username,
      role: inferredRole,
      preferred_language: existing.user?.preferred_language || "hi",
    },
  };

  saveStoredAuth(authState);
  return authState;
}

export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${DJANGO_API_URL}/login/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.access || null;
  } catch {
    return null;
  }
}
