import * as applicationService from "../services/applicationService.js";

export async function applyToOpportunity(req, res, next) {
  try {
    const opportunityId = req.params.id || req.body.opportunityId;
    if (!opportunityId) {
      return res.status(400).json({ success: false, error: "Opportunity ID is required." });
    }

    const application = await applicationService.applyToOpportunity(
      req.userId,
      opportunityId,
      req.body,
    );
    return res.status(201).json({ success: true, data: application });
  } catch (error) {
    return next(error);
  }
}

export async function listApplications(req, res, next) {
  try {
    const { asApplicant, startupId, opportunityId, status, page, limit } = req.query;
    const filter = {
      opportunityId,
      startupId,
      status,
      page,
      limit,
    };

    if (asApplicant === "true") {
      filter.applicantId = req.userId;
    }

    const result = await applicationService.listApplications(filter);
    return res.json({
      success: true,
      data: result.applications,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateApplication(req, res, next) {
  try {
    const application = await applicationService.updateApplicationStatus(
      req.params.id,
      req.userId,
      req.body,
    );
    return res.json({ success: true, data: application });
  } catch (error) {
    return next(error);
  }
}
