import * as opportunityService from "../services/opportunityService.js";

export async function createOpportunity(req, res, next) {
  try {
    const startupId = req.params.startupId || req.body.startupId;
    if (!startupId) {
      return res.status(400).json({ success: false, error: "Startup ID is required." });
    }

    const opportunity = await opportunityService.createOpportunity(req.userId, startupId, req.body);
    return res.status(201).json({ success: true, data: opportunity });
  } catch (error) {
    return next(error);
  }
}

export async function listOpportunities(req, res, next) {
  try {
    const result = await opportunityService.listOpportunities(req.query);
    return res.json({
      success: true,
      data: result.opportunities,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getOpportunity(req, res, next) {
  try {
    const opportunity = await opportunityService.getOpportunityById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, error: "Opportunity not found." });
    }
    return res.json({ success: true, data: opportunity });
  } catch (error) {
    return next(error);
  }
}

export async function updateOpportunity(req, res, next) {
  try {
    const opportunity = await opportunityService.updateOpportunity(
      req.userId,
      req.params.id,
      req.body,
    );
    return res.json({ success: true, data: opportunity });
  } catch (error) {
    return next(error);
  }
}

export async function deleteOpportunity(req, res, next) {
  try {
    await opportunityService.deleteOpportunity(req.userId, req.params.id);
    return res.json({ success: true, message: "Opportunity deleted successfully." });
  } catch (error) {
    return next(error);
  }
}
