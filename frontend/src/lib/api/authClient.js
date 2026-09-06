export const AUTH_TOKEN_KEY = "nexventure.auth.token";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5050/api/v1").replace(
  /\/+$/,
  "",
);

export const API_BASE_URL = API_BASE;

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export async function loginUser(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function signupUser({ name, email, password, role, roles }) {
  return request("/auth/signup", {
    method: "POST",
    body: { name, email, password, role, roles },
  });
}

export async function googleAuthUser(credential) {
  return request("/auth/google", {
    method: "POST",
    body: { credential },
  });
}

export async function logoutUser(token) {
  return request("/auth/logout", {
    method: "POST",
    token,
  });
}

export async function fetchCurrentUser(token) {
  const data = await request("/auth/me", { token });
  return data.user || data.data;
}

export async function completeOnboardingUser(token, profile) {
  return request("/auth/onboarding", {
    method: "PATCH",
    token,
    body: profile,
  });
}

export async function updateCurrentUser(token, updates) {
  const data = await request("/users/me", {
    method: "PATCH",
    token,
    body: updates,
  });
  return data.data;
}

export async function switchActiveRole(token, newRole) {
  return updateCurrentUser(token, { activeRole: newRole });
}

export async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok || data.success === false) {
    throw new Error(getErrorMessage(data, res.statusText || "Request failed"));
  }

  return data;
}

function getErrorMessage(data, fallback) {
  if (typeof data.error === "string") return data.error;
  if (data.error?.message) return data.error.message;
  if (data.message) return data.message;
  return fallback;
}
