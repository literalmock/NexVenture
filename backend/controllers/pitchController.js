import * as pitchService from "../services/pitchService.js";

export async function createPitch(req, res, next) {
  try {
    const startupId = req.params.startupId || req.body.startupId;
    if (!startupId) {
      return res.status(400).json({ success: false, error: "Startup ID is required." });
    }

    const pitch = await pitchService.createPitch(req.userId, startupId, req.body);
    return res.status(201).json({ success: true, data: pitch });
  } catch (error) {
    return next(error);
  }
}

export async function listPitches(req, res, next) {
  try {
    const result = await pitchService.listPitches({
      ...req.query,
      currentUserId: req.userId,
    });
    return res.json({
      success: true,
      data: result.pitches,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPitch(req, res, next) {
  try {
    const pitch = await pitchService.getPitchById(req.params.id, req.userId);
    if (!pitch) {
      return res.status(404).json({ success: false, error: "Pitch not found." });
    }
    return res.json({ success: true, data: pitch });
  } catch (error) {
    return next(error);
  }
}

export async function updatePitch(req, res, next) {
  try {
    const pitch = await pitchService.updatePitch(req.params.id, req.userId, req.body);
    return res.json({ success: true, data: pitch });
  } catch (error) {
    return next(error);
  }
}

export async function likePitch(req, res, next) {
  try {
    const result = await pitchService.togglePitchLike(req.params.id, req.userId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}
