import { API_BASE_URL, AUTH_TOKEN_KEY, request } from "./authClient.js";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function fetchUsers(params) {
  return request(`/users${toQuery(params)}`, { token: getToken() });
}

export function fetchPitches(params) {
  return request(`/pitches${toQuery(params)}`, { token: getToken() });
}

export function createPitch(startupId, payload) {
  return request(`/startups/${startupId}/pitches`, {
    method: "POST",
    body: payload,
    token: getToken(),
  });
}

export function updatePitch(pitchId, payload) {
  return request(`/pitches/${pitchId}`, {
    method: "PATCH",
    body: payload,
    token: getToken(),
  });
}

export function fetchInvestmentInterests(params) {
  return request(`/investments${toQuery(params)}`, { token: getToken() });
}

export function fetchInvestmentDealRooms(params) {
  return request(`/investments/deal-rooms${toQuery(params)}`, { token: getToken() });
}

export function updateInvestmentDealRoom(dealRoomId, payload) {
  return request(`/investments/deal-rooms/${dealRoomId}`, {
    method: "PATCH",
    body: payload,
    token: getToken(),
  });
}

export function updateInvestmentInterest(interestId, payload) {
  return request(`/investments/${interestId}`, {
    method: "PATCH",
    body: payload,
    token: getToken(),
  });
}

export function expressInvestmentInterest(startupId, payload) {
  return request(`/startups/${startupId}/investment-interests`, {
    method: "POST",
    body: payload,
    token: getToken(),
  });
}

export function fetchMentors(params) {
  return request(`/mentors${toQuery(params)}`, { token: getToken() });
}

export function requestMentorship(payload) {
  return request("/mentorships/request", {
    method: "POST",
    body: payload,
    token: getToken(),
  });
}

export function requestStartupMentorship(startupId, payload) {
  return request(`/mentorships/startups/${startupId}/request`, {
    method: "POST",
    body: payload,
    token: getToken(),
  });
}

export function fetchMentorshipRequests(params) {
  return request(`/mentorships${toQuery(params)}`, { token: getToken() });
}

export function fetchMentorshipWorkspaces(params) {
  return request(`/mentorships/workspaces${toQuery(params)}`, { token: getToken() });
}

export function updateMentorshipWorkspace(workspaceId, payload) {
  return request(`/mentorships/workspaces/${workspaceId}`, {
    method: "PATCH",
    body: payload,
    token: getToken(),
  });
}

export function updateMentorshipRequest(requestId, payload) {
  return request(`/mentorships/${requestId}`, {
    method: "PATCH",
    body: payload,
    token: getToken(),
  });
}

export function fetchOpportunities(params) {
  return request(`/opportunities${toQuery(params)}`, { token: getToken() });
}

export function createOpportunity(startupId, payload) {
  return request(`/startups/${startupId}/opportunities`, {
    method: "POST",
    body: payload,
    token: getToken(),
  });
}

export function updateOpportunity(opportunityId, payload) {
  return request(`/opportunities/${opportunityId}`, {
    method: "PATCH",
    body: payload,
    token: getToken(),
  });
}

export function fetchApplications(params) {
  return request(`/applications${toQuery(params)}`, { token: getToken() });
}

export function applyToOpportunity(opportunityId, payload) {
  return request(`/opportunities/${opportunityId}/apply`, {
    method: "POST",
    body: payload,
    token: getToken(),
  });
}

export function updateApplication(applicationId, payload) {
  return request(`/applications/${applicationId}`, {
    method: "PATCH",
    body: payload,
    token: getToken(),
  });
}

export function fetchConversations() {
  return request("/conversations", { token: getToken() });
}

export function createConversation(payload) {
  return request("/conversations", {
    method: "POST",
    body: payload,
    token: getToken(),
  });
}

export function fetchConversationMessages(conversationId) {
  return request(`/conversations/${conversationId}/messages`, { token: getToken() });
}

export function sendConversationMessage(conversationId, content, attachments = []) {
  if (attachments.length) {
    const body = new FormData();
    body.set("content", content || "");
    attachments.forEach((file) => body.append("attachments", file, file.name));
    return request(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body,
      token: getToken(),
    });
  }

  return request(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content },
    token: getToken(),
  });
}

export async function fetchConversationAttachmentBlob(url) {
  const res = await fetch(resolveProtectedApiUrl(url), {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error(res.statusText || "Could not load attachment.");
  }

  return res.blob();
}

function resolveProtectedApiUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE_URL.replace(/\/+$/, "");
  let path = String(url || "");
  if (!path.startsWith("/")) path = `/${path}`;

  const basePath = new URL(base, window.location.origin).pathname.replace(/\/+$/, "");
  if (basePath && path.startsWith(`${basePath}/`)) {
    path = path.slice(basePath.length);
  }

  return `${base}${path}`;
}

export function fetchUnreadMessageCount() {
  return request("/messages/unread-count", { token: getToken() });
}
