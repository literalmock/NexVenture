import { AUTH_TOKEN_KEY, request } from "./authClient.js";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function fetchUpcomingEvents() {
  return request("/events/upcoming", { token: getToken() });
}

export function rsvpEvent(eventId) {
  return request(`/events/${eventId}/rsvp`, {
    method: "POST",
    token: getToken(),
    body: { eventId },
  });
}
