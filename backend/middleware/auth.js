import { getUserIdFromToken } from "../utils/token.js";

/**
 * Middleware that requires a valid Bearer JWT.
 * Attaches req.userId on success, returns 401 otherwise.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }

  const token = authHeader.slice("Bearer ".length);
  const userId = getUserIdFromToken(token);

  if (!userId) {
    return res.status(401).json({ success: false, error: "Invalid or expired session." });
  }

  req.userId = userId;
  return next();
}
