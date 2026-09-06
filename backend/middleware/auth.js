import { getUserIdFromToken } from "../utils/token.js";
import User from "../models/User.js";

/**
 * Middleware that requires a valid Bearer JWT.
 * Attaches req.userId on success, returns 401 otherwise.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }

  const token = authHeader.slice("Bearer ".length);
  const userId = getUserIdFromToken(token);

  if (!userId) {
    return res.status(401).json({ success: false, error: "Invalid or expired session." });
  }

  try {
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid or expired session." });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, error: "This account is suspended." });
    }

    req.userId = user._id;
    req.currentUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Attaches req.userId when a valid Bearer token is present, but allows public
 * requests through when no token is sent.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice("Bearer ".length);
  const userId = getUserIdFromToken(token);

  if (!userId) {
    return res.status(401).json({ success: false, error: "Invalid or expired session." });
  }

  try {
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid or expired session." });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, error: "This account is suspended." });
    }

    req.userId = user._id;
    req.currentUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
