import Event from "../models/Event.js";
import User from "../models/User.js";
import { createNotification } from "./notificationService.js";

/**
 * Seed realistic upcoming events if none currently exist in the database.
 */
export async function ensureDefaultEvents() {
  const count = await Event.countDocuments({ endTime: { $gt: new Date() } });
  if (count > 0) return;

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const sampleEvents = [
    {
      title: "Demo Day — Seed Cohort",
      description: "Exclusive pitch session featuring 12 handpicked seed-stage startups in AI, CleanTech, and FinTech.",
      category: "Demo Day",
      location: "Bengaluru · The Foundry & Online",
      startTime: new Date(now + 2 * DAY + 4 * 3600 * 1000), // 2 days from now, 5:00 PM
      endTime: new Date(now + 2 * DAY + 7 * 3600 * 1000),
      rsvpDeadline: new Date(now + 2 * DAY),
    },
    {
      title: "Investor AMA: SaaS Metrics & Valuation",
      description: "Interactive live session with seasoned angel investors and VC partners discussing unit economics and dilution.",
      category: "AMA",
      location: "Online · Live Stage",
      startTime: new Date(now + 5 * DAY + 2 * 3600 * 1000),
      endTime: new Date(now + 5 * DAY + 4 * 3600 * 1000),
      rsvpDeadline: new Date(now + 4 * DAY + 12 * 3600 * 1000),
    },
    {
      title: "Founder Office Hours: Go-to-Market",
      description: "Intimate small-group working session with exited B2B enterprise SaaS founders on outbound growth engines.",
      category: "Workshop",
      location: "Mumbai · BKC Hub",
      startTime: new Date(now + 8 * DAY + 5 * 3600 * 1000),
      endTime: new Date(now + 8 * DAY + 8 * 3600 * 1000),
      rsvpDeadline: new Date(now + 7 * DAY + 18 * 3600 * 1000),
    },
  ];

  await Event.insertMany(sampleEvents);
}

/**
 * Fetch all upcoming events where endTime is strictly in the future.
 */
export async function getUpcomingEvents(userId = null) {
  await ensureDefaultEvents();

  const now = new Date();
  const events = await Event.find({ endTime: { $gt: now } })
    .sort({ startTime: 1 })
    .limit(20)
    .populate("organizerId", "name avatarUrl role")
    .lean();

  return events.map((event) => {
    const isRsvpd = userId
      ? (event.attendees || []).some((id) => id.toString() === userId.toString())
      : false;
    const isPastDeadline = event.rsvpDeadline ? new Date(event.rsvpDeadline) <= now : false;

    return {
      id: event._id.toString(),
      _id: event._id.toString(),
      title: event.title,
      description: event.description,
      category: event.category,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      rsvpDeadline: event.rsvpDeadline,
      organizer: event.organizerId || null,
      attendeesCount: (event.attendees || []).length,
      isRsvpd,
      isPastDeadline,
    };
  });
}

/**
 * RSVP or un-RSVP to an event.
 */
export async function rsvpToEvent(eventId, userId) {
  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error("Event not found.");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  if (event.endTime <= now) {
    const error = new Error("This event has already ended.");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const attendees = event.attendees || [];
  const isAlreadyRsvpd = attendees.some((id) => id.toString() === userId.toString());

  if (isAlreadyRsvpd) {
    event.attendees = attendees.filter((id) => id.toString() !== userId.toString());
    await event.save();

    if (user.workspace?.eventRsvps) {
      user.workspace.eventRsvps = user.workspace.eventRsvps.filter(
        (id) => id !== eventId && id !== event._id.toString(),
      );
      user.markModified("workspace");
      await user.save();
    }

    return {
      success: true,
      rsvpd: false,
      isRsvpd: false,
      eventRsvps: user.workspace?.eventRsvps || [],
      eventId: event._id.toString(),
      attendeesCount: event.attendees.length,
      message: "RSVP cancelled successfully.",
    };
  }

  // Check deadline before allowing new RSVP
  if (event.rsvpDeadline && new Date(event.rsvpDeadline) <= now) {
    const error = new Error("The RSVP deadline for this event has passed.");
    error.statusCode = 400;
    throw error;
  }

  event.attendees.push(userId);
  await event.save();

  if (!user.workspace) user.workspace = {};
  const existingRsvps = user.workspace.eventRsvps || [];
  if (!existingRsvps.includes(event._id.toString())) {
    user.workspace.eventRsvps = [...existingRsvps, event._id.toString()];
    user.markModified("workspace");
    await user.save();
  }

  // Create notification for event organizer if organizer exists
  if (event.organizerId && event.organizerId.toString() !== userId.toString()) {
    await createNotification({
      recipientId: event.organizerId,
      senderId: userId,
      type: "EVENT_RSVP",
      entityType: "event",
      entityId: event._id.toString(),
      title: `New RSVP: ${event.title}`,
      message: `${user.name} registered to attend ${event.title}.`,
      eventId: event._id.toString(),
    });
  }

  return {
    success: true,
    rsvpd: true,
    isRsvpd: true,
    eventRsvps: user.workspace.eventRsvps,
    eventId: event._id.toString(),
    attendeesCount: event.attendees.length,
    message: "RSVP confirmed successfully!",
  };
}

/**
 * Automated check for event reminders & deadline notifications.
 */
export async function checkAndGenerateEventReminders() {
  const now = new Date();
  const upcomingEvents = await Event.find({
    endTime: { $gt: now },
  }).populate("attendees", "_id name email");

  for (const event of upcomingEvents) {
    const timeToStart = new Date(event.startTime).getTime() - now.getTime();
    const timeToDeadline = new Date(event.rsvpDeadline).getTime() - now.getTime();
    const reminders = event.remindersSent || [];

    // 24-hour reminder for confirmed attendees
    if (timeToStart > 0 && timeToStart <= 24 * 3600 * 1000 && !reminders.includes("24_HOUR")) {
      event.remindersSent.push("24_HOUR");
      await event.save();

      for (const attendee of event.attendees || []) {
        await createNotification({
          recipientId: attendee._id,
          senderId: event.organizerId || attendee._id,
          type: "EVENT_REMINDER",
          entityType: "event",
          entityId: event._id.toString(),
          title: `📅 Event Tomorrow: ${event.title}`,
          message: `${event.title} begins in 24 hours at ${event.location}.`,
          eventId: event._id.toString(),
        });
      }
    }

    // 1-hour reminder for confirmed attendees
    if (timeToStart > 0 && timeToStart <= 3600 * 1000 && !reminders.includes("1_HOUR")) {
      event.remindersSent.push("1_HOUR");
      await event.save();

      for (const attendee of event.attendees || []) {
        await createNotification({
          recipientId: attendee._id,
          senderId: event.organizerId || attendee._id,
          type: "EVENT_REMINDER",
          entityType: "event",
          entityId: event._id.toString(),
          title: `⏳ Starting Soon: ${event.title}`,
          message: `${event.title} begins in 1 hour. Get ready!`,
          eventId: event._id.toString(),
        });
      }
    }

    // Deadline approaching alert
    if (
      timeToDeadline > 0 &&
      timeToDeadline <= 6 * 3600 * 1000 &&
      !reminders.includes("DEADLINE")
    ) {
      event.remindersSent.push("DEADLINE");
      await event.save();
    }
  }
}
