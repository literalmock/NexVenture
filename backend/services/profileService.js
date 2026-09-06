import Profile from "../models/Profile.js";
import User from "../models/User.js";

export async function getProfileByUserId(userId) {
  let profile = await Profile.findOne({ userId }).populate(
    "userId",
    "name email avatarUrl headline bio location skills interests roles activeRole",
  );

  if (!profile) {
    // Create initial profile if doesn't exist
    const user = await User.findById(userId);
    if (!user) return null;

    profile = await Profile.create({
      userId,
      headline: user.headline || "",
      bio: user.bio || "",
      location: user.location || "",
      skills: user.skills || [],
      interests: user.interests || [],
    });

    profile = await Profile.findById(profile._id).populate(
      "userId",
      "name email avatarUrl headline bio location skills interests roles activeRole",
    );
  }

  return profile;
}

export async function updateProfile(userId, updateData) {
  let profile = await Profile.findOne({ userId });

  if (!profile) {
    profile = new Profile({ userId, ...updateData });
  } else {
    Object.assign(profile, updateData);
  }

  await profile.save();

  // Sync basic fields with User model if updated
  const userUpdates = {};
  if (updateData.headline !== undefined) userUpdates.headline = updateData.headline;
  if (updateData.bio !== undefined) userUpdates.bio = updateData.bio;
  if (updateData.location !== undefined) userUpdates.location = updateData.location;
  if (updateData.skills !== undefined) userUpdates.skills = updateData.skills;
  if (updateData.interests !== undefined) userUpdates.interests = updateData.interests;

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(userId, userUpdates);
  }

  return Profile.findById(profile._id).populate(
    "userId",
    "name email avatarUrl headline bio location skills interests roles activeRole",
  );
}
