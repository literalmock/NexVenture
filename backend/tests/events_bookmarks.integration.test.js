import assert from "node:assert/strict";
import test from "node:test";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { api, setupApiTest } from "./helpers/api.js";

const userEmail = `test-eb-${Date.now()}@nexventure.test`;
const testPassword = "NexVenture#2026";

setupApiTest();

test("Event lifecycle, UTC queries, RSVP and Bookmark toggling across views", async () => {
  let token;
  let userId;
  let testEventId;

  try {
    // 1. Sign up user
    const signupRes = await api.post("/auth/signup", {
      name: "Events Tester",
      email: userEmail,
      password: testPassword,
      role: "founder",
    });
    assert.equal(signupRes.response.status, 201);
    token = signupRes.body.token;
    userId = signupRes.body.user.id;

    // 2. Fetch upcoming events (should return seeded future events)
    const eventsRes = await api.get("/events/upcoming", token);
    assert.equal(eventsRes.response.status, 200);
    assert.equal(eventsRes.body.success, true);
    assert.ok(Array.isArray(eventsRes.body.data));
    assert.ok(eventsRes.body.data.length >= 1);

    const firstEvent = eventsRes.body.data[0];
    testEventId = firstEvent._id;

    // 3. RSVP to upcoming event
    const rsvpRes = await api.post(`/events/${testEventId}/rsvp`, {}, token);
    assert.equal(rsvpRes.response.status, 200);
    assert.equal(rsvpRes.body.success, true);
    assert.equal(rsvpRes.body.isRsvpd, true);

    // 4. Verify un-RSVP toggle
    const unRsvpRes = await api.post(`/events/${testEventId}/rsvp`, {}, token);
    assert.equal(unRsvpRes.response.status, 200);
    assert.equal(unRsvpRes.body.isRsvpd, false);

    // 5. Test Bookmarks toggle endpoint
    const dummyStartupId = "startup-test-99";
    const bookmarkAddRes = await api.post(`/workspace/bookmarks/${dummyStartupId}`, {}, token);
    assert.equal(bookmarkAddRes.response.status, 200);
    assert.equal(bookmarkAddRes.body.success, true);
    assert.equal(bookmarkAddRes.body.bookmarked, true);
    assert.ok(bookmarkAddRes.body.bookmarkedStartupIds.includes(dummyStartupId));

    // 6. Test Bookmarks remove toggle
    const bookmarkRemoveRes = await api.post(`/workspace/bookmarks/${dummyStartupId}`, {}, token);
    assert.equal(bookmarkRemoveRes.response.status, 200);
    assert.equal(bookmarkRemoveRes.body.bookmarked, false);
    assert.equal(bookmarkRemoveRes.body.bookmarkedStartupIds.includes(dummyStartupId), false);

    // 7. Verify workspace stats separate unread messages from notifications
    const statsRes = await api.get("/workspace/stats", token);
    assert.equal(statsRes.response.status, 200);
    assert.equal(statsRes.body.success, true);
    assert.equal(typeof statsRes.body.unreadMessages, "number");
    assert.equal(typeof statsRes.body.counts.unreadNotifications, "number");
  } finally {
    if (userId) {
      await User.deleteOne({ _id: userId });
      if (testEventId) {
        await Event.updateOne({ _id: testEventId }, { $pull: { rsvpUsers: userId } });
      }
    }
  }
});
