import * as eventService from "../services/eventService.js";

export async function getUpcomingEvents(req, res, next) {
  try {
    const events = await eventService.getUpcomingEvents(req.userId || null);
    return res.json({ success: true, data: events, events });
  } catch (error) {
    return next(error);
  }
}

export async function rsvpEvent(req, res, next) {
  try {
    const eventId = req.params.id || req.body.eventId;
    if (!eventId) {
      return res.status(400).json({ success: false, error: "eventId is required." });
    }

    const result = await eventService.rsvpToEvent(eventId, req.userId);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
