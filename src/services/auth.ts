const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  authProvider: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function register(
  email: string,
  password: string,
  username: string,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }

  localStorage.setItem("token", data.token);
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }

  localStorage.setItem("token", data.token);
  return data;
}

export async function guestLogin(): Promise<AuthResponse> {
  // Try to reuse existing guest token
  const savedGuestToken = localStorage.getItem("guestToken");
  if (savedGuestToken) {
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedGuestToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user?.authProvider === "guest") {
          localStorage.setItem("token", savedGuestToken);
          return { token: savedGuestToken, user: data.user };
        }
      }
      // Token invalid or not guest — clear it
      localStorage.removeItem("guestToken");
    } catch {
      localStorage.removeItem("guestToken");
    }
  }

  // Create new guest account
  const response = await fetch(`${API_BASE}/api/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Guest login failed");
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("guestToken", data.token);
  return data;
}

export function logout(): void {
  localStorage.removeItem("token");
  // Keep guestToken so guest can be reused
  window.location.href = "/login";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function getCurrentUser(): Promise<AuthUser> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    localStorage.removeItem("token");
    throw new Error("Session expired");
  }

  const data = await response.json();
  return data.user;
}

export async function updateUsername(username: string): Promise<AuthUser> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE}/api/auth/username`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to update username");
  }

  return data.user;
}
