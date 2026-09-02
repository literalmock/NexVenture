import { request } from "./authClient.js";
import { AUTH_TOKEN_KEY } from "./authClient.js";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Create a new post (auth required)
 */
export function createPost({ content, mediaUrls = [], tags = [] }) {
  return request("/posts", {
    method: "POST",
    body: { content, mediaUrls, tags },
    token: getToken(),
  });
}

/**
 * Get paginated feed (public/auth)
 */
export function getFeedPosts(page = 1) {
  return request(`/posts?page=${page}`, { token: getToken() });
}

/**
 * Get posts by a specific user
 */
export function getPostsByUser(userId, page = 1) {
  return request(`/posts/user/${userId}?page=${page}`, { token: getToken() });
}

/**
 * Toggle like on a post (auth required)
 */
export function likePost(postId) {
  return request(`/posts/${postId}/like`, {
    method: "PATCH",
    token: getToken(),
  });
}

/**
 * Add a comment to a post (auth required)
 */
export function addComment(postId, content) {
  return request(`/posts/${postId}/comments`, {
    method: "POST",
    body: { content },
    token: getToken(),
  });
}

/**
 * Delete a comment from a post (auth required)
 */
export function deleteComment(postId, commentId) {
  return request(`/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
    token: getToken(),
  });
}

/**
 * Delete a post (auth required)
 */
export function deletePost(postId) {
  return request(`/posts/${postId}`, {
    method: "DELETE",
    token: getToken(),
  });
}
