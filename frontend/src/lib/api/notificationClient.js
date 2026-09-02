import { request } from "./authClient.js";
import { AUTH_TOKEN_KEY } from "./authClient.js";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Fetch all notifications and counts for authenticated user
 */
export function getNotifications() {
  return request("/notifications", { token: getToken() });
}

/**
 * Send an intro request, partnership, or job application to a startup/founder
 */
export function sendIntroRequest({ startupId, type = "intro_request", message, recipientId }) {
  return request("/notifications/request", {
    method: "POST",
    body: { startupId, type, message, recipientId },
    token: getToken(),
  });
}

/**
 * Approve or Disapprove a pending request
 * @param {string} notificationId
 * @param {'approve' | 'disapprove'} action
 */
export function respondToNotification(notificationId, action) {
  return request(`/notifications/${notificationId}/respond`, {
    method: "PATCH",
    body: { action },
    token: getToken(),
  });
}

/**
 * RSVP to an ecosystem event
 */
export function rsvpEvent(eventId, eventName) {
  return request("/notifications/rsvp", {
    method: "POST",
    body: { eventId, eventName },
    token: getToken(),
  });
}

/**
 * Mark a single notification as read
 */
export function markNotificationAsRead(notificationId) {
  return request(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    token: getToken(),
  });
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead() {
  return request("/notifications/mark-all-read", {
    method: "PATCH",
    token: getToken(),
  });
}
