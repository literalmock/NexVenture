import * as adminService from "../services/adminService.js";

export async function createReport(req, res, next) {
  try {
    const report = await adminService.createReport(req.userId, req.body);
    return res.status(201).json({ success: true, data: report });
  } catch (error) {
    return next(error);
  }
}

export async function listReports(req, res, next) {
  try {
    const result = await adminService.listReports(req.query);
    return res.json({
      success: true,
      data: result.reports,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function resolveReport(req, res, next) {
  try {
    const report = await adminService.resolveReport(req.params.id, req.body);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found." });
    }
    return res.json({ success: true, data: report });
  } catch (error) {
    return next(error);
  }
}

export async function suspendUser(req, res, next) {
  try {
    const { isSuspended } = req.body;
    const user = await adminService.toggleUserSuspension(req.params.id, Boolean(isSuspended));
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
}

export async function verifyMentor(req, res, next) {
  try {
    const { isVerified } = req.body;
    const mentor = await adminService.verifyMentor(req.params.id, Boolean(isVerified));
    if (!mentor) {
      return res.status(404).json({ success: false, error: "Mentor profile not found." });
    }
    return res.json({ success: true, data: mentor });
  } catch (error) {
    return next(error);
  }
}
