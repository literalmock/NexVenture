import assert from "node:assert/strict";
import test from "node:test";
import Notification from "../models/Notification.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { api, setupApiTest } from "./helpers/api.js";

const founderEmail = `test-founder-${Date.now()}@nexventure.test`;
const investorEmail = `test-investor-${Date.now()}@nexventure.test`;
const testPassword = "NexVenture#2026";

setupApiTest();

test("complete community feed, comments, company intro requests, and approval workflow", async () => {
  let founderToken;
  let investorToken;
  let founderId;
  let investorId;
  let postId;
  let requestId;

  try {
    // 1. Create founder user
    const founderRes = await api.post("/auth/signup", {
      name: "Test Founder",
      email: founderEmail,
      password: testPassword,
      role: "founder",
    });
    assert.equal(founderRes.response.status, 201);
    founderToken = founderRes.body.token;
    founderId = founderRes.body.user.id;

    // 2. Create investor user
    const investorRes = await api.post("/auth/signup", {
      name: "Test Investor",
      email: investorEmail,
      password: testPassword,
      role: "investor",
    });
    assert.equal(investorRes.response.status, 201);
    investorToken = investorRes.body.token;
    investorId = investorRes.body.user.id;

    // 3. Founder creates a post
    const postRes = await api.post(
      "/posts",
      {
        content: "Excited to launch our new battery optimization algorithm!",
        tags: ["CleanTech", "Launch"],
      },
      founderToken,
    );
    assert.equal(postRes.response.status, 201);
    assert.equal(postRes.body.success, true);
    assert.equal(
      postRes.body.post.content,
      "Excited to launch our new battery optimization algorithm!",
    );
    assert.equal(postRes.body.post.authorRole, "founder");
    postId = postRes.body.post.id;

    // 4. Investor likes founder's post
    const likeRes = await api.patch(`/posts/${postId}/like`, {}, investorToken);
    assert.equal(likeRes.response.status, 200);
    assert.equal(likeRes.body.post.likeCount, 1);
    assert.equal(likeRes.body.post.likedByViewer, true);

    // 5. Investor comments on founder's post
    const commentRes = await api.post(
      `/posts/${postId}/comments`,
      { content: "Great progress! Would love to chat about seed metrics." },
      investorToken,
    );
    assert.equal(commentRes.response.status, 201);
    assert.equal(commentRes.body.post.commentCount, 1);
    assert.equal(
      commentRes.body.post.comments[0].content,
      "Great progress! Would love to chat about seed metrics.",
    );

    for (let i = 0; i < 12; i += 1) {
      const extraComment = await api.post(
        `/posts/${postId}/comments`,
        { content: `Pagination regression comment ${i + 1}` },
        investorToken,
      );
      assert.equal(extraComment.response.status, 201);
    }

    const feedRes = await api.get("/posts", investorToken);
    assert.equal(feedRes.response.status, 200);
    const feedPost = feedRes.body.posts.find((post) => post.id === postId);
    assert.equal(feedPost.commentCount, 13);
    assert.equal(feedPost.comments.length, 3);
    assert.equal(feedPost.hasMoreComments, true);

    const olderCommentsRes = await api.get(`/posts/${postId}/comments?before=3&limit=5`);
    assert.equal(olderCommentsRes.response.status, 200);
    assert.equal(olderCommentsRes.body.comments.length, 5);
    assert.equal(olderCommentsRes.body.hasMore, true);

    // 6. Investor sends introduction request to Founder's company
    const reqRes = await api.post(
      "/notifications/request",
      {
        recipientId: founderRes.body.user.id,
        type: "intro_request",
        message: "Requesting a 15-minute introductory meeting.",
      },
      investorToken,
    );
    assert.equal(reqRes.response.status, 201);
    assert.equal(reqRes.body.success, true);
    assert.equal(reqRes.body.notification.status, "pending");
    requestId = reqRes.body.notification.id;

    // 7. Founder checks notifications and sees the pending request
    const founderNotifsRes = await api.get("/notifications", founderToken);
    assert.equal(founderNotifsRes.response.status, 200);
    assert.ok(founderNotifsRes.body.notifications.length >= 1);
    assert.ok(founderNotifsRes.body.pendingRequestsCount >= 1);

    // 8. Founder Approves the request
    const approveRes = await api.patch(
      `/notifications/${requestId}/respond`,
      { action: "approve" },
      founderToken,
    );
    assert.equal(approveRes.response.status, 200);
    assert.equal(approveRes.body.notification.status, "approved");

    // 9. Investor receives notification that request was approved
    const investorNotifsRes = await api.get("/notifications", investorToken);
    assert.equal(investorNotifsRes.response.status, 200);
    const approvedNotif = investorNotifsRes.body.notifications.find(
      (n) => n.type === "request_response",
    );
    assert.ok(approvedNotif);
    assert.equal(approvedNotif.status, "approved");

    // 10. Investor RSVPs to an event
    const rsvpRes = await api.post(
      "/notifications/rsvp",
      { eventId: "demo-day", eventName: "NEX Demo Day" },
      investorToken,
    );
    assert.equal(rsvpRes.response.status, 200);
    assert.equal(rsvpRes.body.rsvpd, true);
    assert.ok(rsvpRes.body.eventRsvps.includes("demo-day"));
  } finally {
    await User.deleteMany({ email: { $in: [founderEmail, investorEmail] } });
    if (postId) await Post.deleteOne({ _id: postId });
    if (requestId) await Notification.deleteMany({ _id: requestId });
    await Notification.deleteMany({
      $or: [
        { recipient: { $in: [founderId, investorId].filter(Boolean) } },
        { sender: { $in: [founderId, investorId].filter(Boolean) } },
      ],
    });
  }
});
