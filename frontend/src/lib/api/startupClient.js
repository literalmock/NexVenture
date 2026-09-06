import { AUTH_TOKEN_KEY, request } from "./authClient.js";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

let catalogRequest = null;

export function fetchStartups() {
  if (!catalogRequest) {
    catalogRequest = request("/startups").catch((error) => {
      catalogRequest = null;
      throw error;
    });
  }
  return catalogRequest;
}

/**
 * Drop the cached directory response so the next fetchStartups() call reflects
 * a listing that was just published or updated.
 */
export function invalidateStartupsCache() {
  catalogRequest = null;
}

/**
 * The caller's own published startup listing, if any (auth required).
 */
export function fetchMyStartup() {
  return request("/startups/mine", { token: getToken() });
}

/**
 * Publish or update the caller's own startup so it appears in the public directory.
 */
export async function publishStartup(payload) {
  const res = await request("/startups", {
    method: "POST",
    body: payload,
    token: getToken(),
  });
  invalidateStartupsCache();
  return res;
}

export async function updateStartup(startupId, payload) {
  const res = await request(`/startups/${startupId}`, {
    method: "PATCH",
    body: payload,
    token: getToken(),
  });
  invalidateStartupsCache();
  return res;
}

export function fetchStartupMembers(startupId) {
  return request(`/startups/${startupId}/members`, { token: getToken() });
}

export function addStartupMember(startupId, payload) {
  return request(`/startups/${startupId}/members`, {
    method: "POST",
    body: payload,
    token: getToken(),
  });
}

export function updateStartupMember(startupId, memberId, payload) {
  return request(`/startups/${startupId}/members/${memberId}`, {
    method: "PATCH",
    body: payload,
    token: getToken(),
  });
}

export function removeStartupMember(startupId, memberId) {
  return request(`/startups/${startupId}/members/${memberId}`, {
    method: "DELETE",
    token: getToken(),
  });
}
