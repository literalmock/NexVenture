const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5050/api/v1").replace(/\/$/, "");
export const AUTH_TOKEN_KEY = "nexventure.auth.token";

export function loginUser(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function signupUser(params) {
  return request("/auth/signup", {
    method: "POST",
    body: params,
  });
}

export function googleAuthUser(credential) {
  return request("/auth/google", { method: "POST", body: { credential } });
}

export function completeOnboardingUser(token, profile) {
  return request("/auth/onboarding", { method: "PATCH", body: profile, token });
}

export function resetPasswordUser(email) {
  return request("/auth/reset-password", {
    method: "POST",
    body: { email },
  });
}

export async function fetchCurrentUser(token) {
  const response = await request("/auth/me", { token });
  return response.user;
}

export async function request(path, { method = "GET", body, token } = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the API. Make sure the backend and MongoDB are running.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "The request could not be completed.");
  }

  return data;
}
