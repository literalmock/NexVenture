import Startup from "../models/Startup.js";

export async function listStartups(req, res, next) {
  try {
    const startups = await Startup.find({})
      .select("-_id -__v -createdAt -updatedAt")
      .sort({ top: -1, growth: -1, name: 1 })
      .lean()
      .exec();

    return res.json({
      success: true,
      count: startups.length,
      startups,
    });
  } catch (error) {
    return next(error);
  }
}
