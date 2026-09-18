import { API_BASE_URL, AUTH_TOKEN_KEY } from "./authClient.js";

export function createMessageSocket() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5050";
    const url = new URL(API_BASE_URL, origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/messages";
    url.searchParams.set("token", token);

    return new WebSocket(url.toString());
  } catch (error) {
    console.warn("Realtime WebSocket connection could not be established:", error);
    return null;
  }
}
