import * as mentorService from "../services/mentorService.js";

export async function listMentors(req, res, next) {
  try {
    const result = await mentorService.listMentors(req.query);
    return res.json({
      success: true,
      data: result.mentors,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMentor(req, res, next) {
  try {
    const mentor = await mentorService.getMentorById(req.params.id);
    if (!mentor) {
      return res.status(404).json({ success: false, error: "Mentor not found." });
    }
    return res.json({ success: true, data: mentor });
  } catch (error) {
    return next(error);
  }
}

export async function updateMentorProfile(req, res, next) {
  try {
    const updated = await mentorService.updateMentorProfile(req.userId, req.body);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
}

export async function requestMentorship(req, res, next) {
  try {
    const request = await mentorService.requestMentorship(req.userId, req.body);
    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    return next(error);
  }
}

export async function requestFounderMentorship(req, res, next) {
  try {
    const request = await mentorService.requestFounderMentorship(
      req.userId,
      req.params.startupId || req.body.startupId,
      req.body,
    );
    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    return next(error);
  }
}

export async function listMentorshipRequests(req, res, next) {
  try {
    const { role } = req.query;
    const filter = { ...req.query };

    if (role === "mentor" || req.query.asMentor === "true") {
      filter.mentorId = req.userId;
    } else {
      filter.founderId = req.userId;
    }

    const result = await mentorService.listMentorshipRequests(filter);
    return res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMentorshipWorkspaces(req, res, next) {
  try {
    const result = await mentorService.listMentorshipWorkspaces({
      ...req.query,
      userId: req.userId,
    });
    return res.json({
      success: true,
      data: result.workspaces,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMentorshipWorkspace(req, res, next) {
  try {
    const workspace = await mentorService.getMentorshipWorkspace(req.userId, req.params.id);
    return res.json({ success: true, data: workspace });
  } catch (error) {
    return next(error);
  }
}

export async function updateMentorshipWorkspace(req, res, next) {
  try {
    const workspace = await mentorService.updateMentorshipWorkspace(
      req.userId,
      req.params.id,
      req.body,
    );
    return res.json({ success: true, data: workspace });
  } catch (error) {
    return next(error);
  }
}

export async function updateMentorshipRequest(req, res, next) {
  try {
    const updated = await mentorService.updateMentorshipRequestStatus(
      req.params.id,
      req.userId,
      req.body,
    );
    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
}
