import * as investmentService from "../services/investmentService.js";

export async function expressInterest(req, res, next) {
  try {
    const startupId = req.params.startupId || req.body.startupId;
    if (!startupId) {
      return res.status(400).json({ success: false, error: "Startup ID is required." });
    }

    const result = await investmentService.expressInterest(req.userId, startupId, req.body);
    return res.status(result.created ? 201 : 200).json({
      success: true,
      data: result.interest,
      existing: !result.created,
      status: result.interest.status,
      conversationId: result.interest.conversationId || null,
      dealRoom: result.dealRoom || null,
      dealRoomId: result.interest.dealRoomId || result.dealRoom?._id || null,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listInterests(req, res, next) {
  try {
    const result = await investmentService.listInterests({
      ...req.query,
      investorId: req.query.asInvestor === "true" ? req.userId : req.query.investorId,
    });
    return res.json({
      success: true,
      data: result.interests,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateInterest(req, res, next) {
  try {
    const interest = await investmentService.updateInterestStatus(
      req.params.id,
      req.userId,
      req.body,
    );
    return res.json({
      success: true,
      data: interest,
      conversationId: interest.conversationId || null,
      dealRoom: interest.dealRoom || null,
      dealRoomId: interest.dealRoomId || interest.dealRoom?._id || null,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listDealRooms(req, res, next) {
  try {
    const result = await investmentService.listDealRooms({
      ...req.query,
      userId: req.userId,
    });
    return res.json({
      success: true,
      data: result.dealRooms,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDealRoom(req, res, next) {
  try {
    const dealRoom = await investmentService.getDealRoom(req.userId, req.params.id);
    return res.json({ success: true, data: dealRoom });
  } catch (error) {
    return next(error);
  }
}

export async function updateDealRoom(req, res, next) {
  try {
    const dealRoom = await investmentService.updateDealRoom(req.userId, req.params.id, req.body);
    return res.json({ success: true, data: dealRoom });
  } catch (error) {
    return next(error);
  }
}
