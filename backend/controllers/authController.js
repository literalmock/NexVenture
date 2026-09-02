import User from "../models/User.js";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { USER_ROLE_VALUES } from "../utils/enums.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createAuthToken, getUserIdFromToken } from "../utils/token.js";

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const user = await User.findOne({ email: normalizeEmail(email) })
      .select("+passwordHash")
      .exec();

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    return sendAuthResponse(res, 200, user);
  } catch (error) {
    return next(error);
  }
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: "Name, email, password, and role are required.",
      });
    }

    if (!USER_ROLE_VALUES.includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid account role." });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.exists({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email address already exists.",
      });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role,
      roles: [role],
      authProviders: ["local"],
      onboardingComplete: true,
    });

    return sendAuthResponse(res, 201, user);
  } catch (error) {
    return next(error);
  }
}

export async function googleAuth(req, res, next) {
  try {
    if (!env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        success: false,
        error: "Google sign-in is not configured. Add GOOGLE_CLIENT_ID to the backend environment.",
      });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({
        success: false,
        error: "A Google ID credential is required.",
      });
    }

    let payload;
    try {
      const ticket = await new OAuth2Client(env.GOOGLE_CLIENT_ID).verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res
        .status(401)
        .json({ success: false, error: "Google could not verify this sign-in." });
    }

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({
        success: false,
        error: "Google did not provide a verified email address.",
      });
    }

    const email = normalizeEmail(payload.email);
    let user = await User.findOne({
      $or: [{ googleSubject: payload.sub }, { email }],
    })
      .select("+googleSubject")
      .exec();

    if (user) {
      user.googleSubject = payload.sub;
      user.avatarUrl = user.avatarUrl || payload.picture || "";
      user.authProviders = [...new Set([...(user.authProviders || []), "google"])];
      await user.save();
    } else {
      user = await User.create({
        name: String(payload.name || email.split("@")[0]).trim(),
        email,
        googleSubject: payload.sub,
        avatarUrl: payload.picture || "",
        authProviders: ["google"],
        roles: [],
        role: USER_ROLE_VALUES[0],
        onboardingComplete: false,
      });
    }

    return sendAuthResponse(res, 200, user);
  } catch (error) {
    return next(error);
  }
}

export async function completeOnboarding(req, res, next) {
  try {
    const token = getBearerToken(req.headers.authorization);
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Invalid or missing auth token." });
    }

    const roles = Array.isArray(req.body.roles) ? [...new Set(req.body.roles)] : [];
    if (!roles.length || roles.some((role) => !USER_ROLE_VALUES.includes(role))) {
      return res.status(400).json({
        success: false,
        error: "Choose at least one valid role: founder, investor, mentor, or student.",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        role: roles[0],
        roles,
        onboardingComplete: true,
        headline: String(req.body.headline || "")
          .trim()
          .slice(0, 120),
        location: String(req.body.location || "")
          .trim()
          .slice(0, 80),
      },
      { returnDocument: "after", runValidators: true },
    ).exec();

    if (!user) {
      return res.status(404).json({ success: false, error: "Account not found." });
    }

    return res.json({ success: true, user: toAuthUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email address is required." });
    }

    return res.status(501).json({
      success: false,
      error: "Password recovery is not configured yet.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const token = getBearerToken(req.headers.authorization);
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Invalid or missing auth token." });
    }

    const user = await User.findById(userId).exec();

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid or expired session." });
    }

    return res.json({ success: true, user: toAuthUser(user) });
  } catch (error) {
    return next(error);
  }
}

function sendAuthResponse(res, statusCode, user) {
  return res.status(statusCode).json({
    success: true,
    token: createAuthToken(user._id.toString()),
    user: toAuthUser(user),
  });
}

function toAuthUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    roles:
      user.onboardingComplete === false
        ? user.roles || []
        : user.roles?.length
          ? user.roles
          : [user.role],
    onboardingComplete: user.onboardingComplete !== false,
    headline: user.headline || "",
    bio: user.bio || "",
    location: user.location || "",
    avatarUrl: user.avatarUrl || "",
    skills: user.skills || [],
    interests: user.interests || [],
    linkedStartupId: user.linkedStartupId || null,
    authProviders: user.authProviders || ["local"],
  };
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  return authorizationHeader.slice("Bearer ".length);
}
