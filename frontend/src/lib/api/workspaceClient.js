import { AUTH_TOKEN_KEY, request } from "./authClient.js";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function fetchWorkspace() {
  return request("/workspace", { token: getToken() });
}

export function fetchWorkspaceStats() {
  return request("/workspace/stats", { token: getToken() });
}

export function patchWorkspace(field, value) {
  return request("/workspace", {
    method: "PATCH",
    token: getToken(),
    body: { field, value },
  });
}
