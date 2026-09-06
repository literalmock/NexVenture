import * as profileService from "../services/profileService.js";

export async function getProfile(req, res, next) {
  try {
    const userId = req.params.userId || req.userId;
    const profile = await profileService.getProfileByUserId(userId);

    if (!profile) {
      return res.status(404).json({ success: false, error: "Profile not found." });
    }

    return res.json({ success: true, data: profile });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const updatedProfile = await profileService.updateProfile(req.userId, req.body);
    return res.json({ success: true, data: updatedProfile });
  } catch (error) {
    return next(error);
  }
}
