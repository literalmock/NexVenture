import { API_BASE_URL, AUTH_TOKEN_KEY } from "./authClient.js";

export function createMessageSocket() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;

  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/messages";
  url.searchParams.set("token", token);

  return new WebSocket(url.toString());
}
