import * as userService from "../services/userService.js";

export async function getUser(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
}

export async function updateMe(req, res, next) {
  try {
    const updatedUser = await userService.updateUser(req.userId, req.body);
    return res.json({ success: true, data: updatedUser });
  } catch (error) {
    return next(error);
  }
}

export async function getUsers(req, res, next) {
  try {
    const result = await userService.listUsers({
      ...req.query,
      excludeUserId: req.userId,
    });
    return res.json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}
