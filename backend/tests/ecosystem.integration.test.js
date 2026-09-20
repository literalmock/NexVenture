import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import WebSocket from "ws";
import Application from "../models/Application.js";
import Conversation from "../models/Conversation.js";
import InvestmentInterest from "../models/InvestmentInterest.js";
import MentorProfile from "../models/MentorProfile.js";
import MentorshipRequest from "../models/MentorshipRequest.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import Opportunity from "../models/Opportunity.js";
import Pitch from "../models/Pitch.js";
import PitchLike from "../models/PitchLike.js";
import Startup from "../models/Startup.js";
import StartupMembership from "../models/StartupMembership.js";
import User from "../models/User.js";
import { api, getApiUrl, setupApiTest } from "./helpers/api.js";

setupApiTest();

test("complete ecosystem integration: multi-role, startups, pitches, investments, mentorship, opportunities, deal rooms", async () => {
  const ts = Date.now();
  const founderEmail = `founder_${ts}@nexventure.test`;
  const investorEmail = `investor_${ts}@nexventure.test`;
  const investorPeerEmail = `investor_peer_${ts}@nexventure.test`;
  const studentEmail = `student_${ts}@nexventure.test`;
  const mentorEmail = `mentor_${ts}@nexventure.test`;

  let founderId,
    investorId,
    investorPeerId,
    studentId,
    mentorId,
    startupId,
    studentStartupId,
    pitchId,
    studentPitchId,
    oppId,
    interestId,
    ignoredInterestId,
    mentorshipId,
    mentorInitiatedMentorshipId,
    mentorshipWorkspaceId,
    orphanMentorUserId;

  try {
    // 1. Signup Founder
    const founderRes = await api.post("/auth/signup", {
      name: `Founder_${ts}`,
      email: founderEmail,
      password: "Password123!",
      role: "founder",
      roles: ["founder", "mentor"],
    });
    if (founderRes.response.status !== 201) {
      console.error("Founder signup failed:", founderRes.body);
    }
    assert.equal(founderRes.response.status, 201);
    const founderToken = founderRes.body.token;
    founderId = founderRes.body.user.id;
    assert.equal(founderRes.body.user.role, "founder");

    // 2. Signup Investor
    const investorRes = await api.post("/auth/signup", {
      name: `Investor_${ts}`,
      email: investorEmail,
      password: "Password123!",
      role: "investor",
    });
    assert.equal(investorRes.response.status, 201);
    const investorToken = investorRes.body.token;
    investorId = investorRes.body.user.id;

    const investorPeerRes = await api.post("/auth/signup", {
      name: `InvestorPeer_${ts}`,
      email: investorPeerEmail,
      password: "Password123!",
      role: "investor",
    });
    assert.equal(investorPeerRes.response.status, 201);
    const investorPeerToken = investorPeerRes.body.token;
    investorPeerId = investorPeerRes.body.user.id;

    const investorSearchRes = await api.get("/users?role=investor", investorToken);
    assert.equal(investorSearchRes.response.status, 200);
    assert.ok(!investorSearchRes.body.data.some((user) => user._id === investorId));
    assert.ok(investorSearchRes.body.data.some((user) => user._id === investorPeerId));

    // 3. Signup Student
    const studentRes = await api.post("/auth/signup", {
      name: `Student_${ts}`,
      email: studentEmail,
      password: "Password123!",
      role: "student",
    });
    assert.equal(studentRes.response.status, 201);
    const studentToken = studentRes.body.token;
    studentId = studentRes.body.user.id;

    const studentStartupRes = await api.post(
      "/startups",
      {
        name: `Student Startup ${ts}`,
        description: "Students should apply to opportunities, not bypass founder startup gates.",
      },
      studentToken,
    );
    assert.equal(studentStartupRes.response.status, 403);

    const studentFounderRes = await api.patch(
      "/auth/onboarding",
      {
        roles: ["student", "founder"],
        activeRole: "founder",
        headline: "Student founder building AI prototypes",
        location: "Bengaluru, India",
      },
      studentToken,
    );
    assert.equal(studentFounderRes.response.status, 200);
    assert.equal(studentFounderRes.body.user.activeRole, "founder");
    assert.equal(studentFounderRes.body.user.role, "founder");
    assert.ok(studentFounderRes.body.user.roles.includes("student"));
    assert.ok(studentFounderRes.body.user.roles.includes("founder"));

    const studentFounderStartupRes = await api.post(
      "/startups",
      {
        name: `Student Founder Lab ${ts}`,
        description: "Prototype studio for campus founders validating startup ideas.",
        industry: "AI & ML",
        stage: "Idea",
        location: "Bengaluru, India",
        fundingRaised: "$0",
        fundingGoal: "$50,000",
        teamSize: 1,
        hiring: false,
      },
      studentToken,
    );
    assert.equal(studentFounderStartupRes.response.status, 201);
    const studentStartupData =
      studentFounderStartupRes.body.data || studentFounderStartupRes.body.startup;
    studentStartupId = studentStartupData._id || studentStartupData.id;

    const studentPitchRes = await api.post(
      `/startups/${studentStartupId}/pitches`,
      {
        title: "Student Founder Lab: Campus MVP builder",
        elevatorPitch: "We help student founders turn validated ideas into working MVPs.",
        problem: "Campus founders lack technical execution support after ideation.",
        solution: "A vetted student-builder network for fast product prototypes.",
        fundingAsk: "$50,000",
        status: "published",
      },
      studentToken,
    );
    assert.equal(studentPitchRes.response.status, 201);
    studentPitchId = studentPitchRes.body.data._id;

    // 4. Signup Mentor
    const mentorRes = await api.post("/auth/signup", {
      name: `Mentor_${ts}`,
      email: mentorEmail,
      password: "Password123!",
      role: "mentor",
    });
    assert.equal(mentorRes.response.status, 201);
    const mentorToken = mentorRes.body.token;
    mentorId = mentorRes.body.user.id;

    // 5. Update Mentor Profile
    const updateMentorRes = await api.patch(
      "/mentors/profile",
      {
        expertise: ["SaaS Growth", "Fundraising", "Product Design"],
        experience: 10,
        sessionPrice: 0,
        availability: "5 hrs / week",
      },
      mentorToken,
    );
    assert.equal(updateMentorRes.response.status, 200);
    assert.equal(updateMentorRes.body.success, true);

    orphanMentorUserId = new mongoose.Types.ObjectId();
    await MentorProfile.create({
      userId: orphanMentorUserId,
      expertise: ["Stale profile"],
      bio: "This profile should not appear without a real user account.",
    });

    const mentorDirectoryRes = await api.get("/mentors?limit=50", founderToken);
    assert.equal(mentorDirectoryRes.response.status, 200);
    assert.ok(
      mentorDirectoryRes.body.data.some(
        (mentor) => mentor.name === `Mentor_${ts}` && mentor.userId?._id === mentorId,
      ),
    );
    assert.ok(
      !mentorDirectoryRes.body.data.some(
        (mentor) =>
          (mentor.name === "Mentor" && !mentor.userId?.name) ||
          mentor.userId?._id === orphanMentorUserId.toString(),
      ),
    );

    // 6. Founder creates a Startup
    const startupRes = await api.post(
      "/startups",
      {
        name: `HyperScale AI ${ts}`,
        description: "Autonomous multi-agent platform for enterprise scale.",
        industry: "AI & ML",
        stage: "Seed",
        location: "San Francisco, CA",
        fundingRaised: "$500,000",
        fundingGoal: "$2,000,000",
        teamSize: 4,
        hiring: true,
      },
      founderToken,
    );
    assert.equal(startupRes.response.status, 201);
    const startupData = startupRes.body.data || startupRes.body.startup;
    startupId = startupData._id || startupData.id;

    const memberRes = await api.post(
      `/startups/${startupId}/members`,
      {
        email: mentorEmail,
        role: "cofounder",
        title: "GTM advisor",
      },
      founderToken,
    );
    assert.equal(memberRes.response.status, 201);
    assert.equal(memberRes.body.data.role, "cofounder");

    const membersRes = await api.get(`/startups/${startupId}/members`, founderToken);
    assert.equal(membersRes.response.status, 200);
    assert.ok(membersRes.body.data.length >= 2);

    const founderMentorDirectRes = await api.post(
      "/conversations",
      {
        targetUserId: mentorId,
        type: "direct",
        relatedStartupId: startupId,
      },
      founderToken,
    );
    assert.equal(founderMentorDirectRes.response.status, 200);
    const mentorDirectConversationId = founderMentorDirectRes.body.data._id;
    assert.ok(
      founderMentorDirectRes.body.data.participants.some(
        (participant) => participant._id === mentorId,
      ),
    );
    const mentorDirectParticipant = founderMentorDirectRes.body.data.participants.find(
      (participant) => participant._id === mentorId,
    );
    assert.equal(mentorDirectParticipant.conversationContext.line, `Mentor • ${startupData.name}`);

    const founderInvestorContactRes = await api.post(
      "/conversations",
      {
        targetUserId: investorId,
        type: "investment",
        relatedStartupId: startupId,
      },
      founderToken,
    );
    assert.equal(founderInvestorContactRes.response.status, 200);
    const investorContactConversationId = founderInvestorContactRes.body.data._id;
    assert.notEqual(investorContactConversationId, mentorDirectConversationId);
    assert.ok(
      founderInvestorContactRes.body.data.participants.some(
        (participant) => participant._id === investorId,
      ),
    );
    assert.ok(
      !founderInvestorContactRes.body.data.participants.some(
        (participant) => participant._id === mentorId,
      ),
    );
    assert.equal(founderInvestorContactRes.body.data.type, "investment");
    assert.equal(founderInvestorContactRes.body.data.relatedStartupId._id, startupId);
    const contactedInvestorParticipant = founderInvestorContactRes.body.data.participants.find(
      (participant) => participant._id === investorId,
    );
    assert.equal(
      contactedInvestorParticipant.conversationContext.line,
      `Investor • ${startupData.name}`,
    );

    const repeatFounderInvestorContactRes = await api.post(
      "/conversations",
      {
        targetUserId: investorId,
        type: "investment",
        relatedStartupId: startupId,
      },
      founderToken,
    );
    assert.equal(repeatFounderInvestorContactRes.response.status, 200);
    assert.equal(repeatFounderInvestorContactRes.body.data._id, investorContactConversationId);

    const mismatchedConversationTargetRes = await api.post(
      "/conversations",
      {
        conversationId: mentorDirectConversationId,
        targetUserId: investorId,
        type: "direct",
        relatedStartupId: startupId,
      },
      founderToken,
    );
    assert.equal(mismatchedConversationTargetRes.response.status, 404);

    const invalidInvestmentParticipantRes = await api.post(
      "/conversations",
      {
        targetUserId: mentorId,
        type: "investment",
        relatedStartupId: startupId,
      },
      founderToken,
    );
    assert.equal(invalidInvestmentParticipantRes.response.status, 403);

    // 7. Founder creates a Pitch for the Startup
    const pitchRes = await api.post(
      `/startups/${startupId}/pitches`,
      {
        title: "HyperScale AI: The Autonomous Workflow Engine",
        elevatorPitch:
          "We automate 90% of manual enterprise operations using cooperative AI agents.",
        problem: "Enterprises spend $300B annually on repetitive workflows.",
        solution: "Self-orchestrating agent swarms that integrate with legacy infrastructure.",
        fundingAsk: "$2,000,000",
        valuation: "$15,000,000",
        status: "published",
      },
      founderToken,
    );
    assert.equal(pitchRes.response.status, 201);
    pitchId = pitchRes.body.data._id;

    // 8. Investor explores pitches and likes the pitch
    const investorPitchEditRes = await api.patch(
      `/pitches/${pitchId}`,
      {
        title: "Investor should not be able to edit this pitch",
      },
      investorToken,
    );
    assert.equal(investorPitchEditRes.response.status, 403);

    const likePitchRes = await api.post(`/pitches/${pitchId}/like`, {}, investorToken);
    assert.equal(likePitchRes.response.status, 200);
    assert.equal(likePitchRes.body.data.isLiked, true);

    // 9. Investor expresses investment interest
    const interestRes = await api.post(
      `/startups/${startupId}/investment-interests`,
      {
        pitchId,
        amountRange: "$100,000 - $250,000",
        message: "Very impressed with your architecture and agent swarms. Let's chat!",
      },
      investorToken,
    );
    assert.equal(interestRes.response.status, 201);
    interestId = interestRes.body.data._id;

    const duplicatePendingInterestRes = await api.post(
      `/startups/${startupId}/investment-interests`,
      {
        pitchId,
        amountRange: "$500,000 - $750,000",
        message: "This should return the existing pending interest, not create a duplicate.",
      },
      investorToken,
    );
    assert.equal(duplicatePendingInterestRes.response.status, 200);
    assert.equal(duplicatePendingInterestRes.body.existing, true);
    assert.equal(duplicatePendingInterestRes.body.data._id, interestId);
    assert.equal(duplicatePendingInterestRes.body.data.status, "pending");
    assert.equal(
      await InvestmentInterest.countDocuments({
        investorId,
        startupId,
        status: { $in: ["pending", "accepted", "founder_review"] },
      }),
      1,
    );

    const ignoredInterestRes = await api.post(
      `/startups/${startupId}/investment-interests`,
      {
        pitchId,
        amountRange: "$50,000 - $75,000",
        message: "Founder should be able to ignore this without allowing duplicates.",
      },
      investorPeerToken,
    );
    assert.equal(ignoredInterestRes.response.status, 201);
    ignoredInterestId = ignoredInterestRes.body.data._id;

    const ignoreInterestRes = await api.patch(
      `/investments/${ignoredInterestId}`,
      {
        status: "ignored",
        founderNotes: "Not a fit right now.",
      },
      founderToken,
    );
    assert.equal(ignoreInterestRes.response.status, 200);
    assert.equal(ignoreInterestRes.body.data.status, "founder_review");

    const duplicateIgnoredInterestRes = await api.post(
      `/startups/${startupId}/investment-interests`,
      {
        pitchId,
        amountRange: "$75,000 - $100,000",
        message: "Ignored active requests should not duplicate.",
      },
      investorPeerToken,
    );
    assert.equal(duplicateIgnoredInterestRes.response.status, 200);
    assert.equal(duplicateIgnoredInterestRes.body.data._id, ignoredInterestId);
    assert.equal(duplicateIgnoredInterestRes.body.data.status, "founder_review");

    // 10. Founder receives investment interests and accepts
    const investorAcceptRes = await api.patch(
      `/investments/${interestId}`,
      {
        status: "accepted",
      },
      investorToken,
    );
    assert.equal(investorAcceptRes.response.status, 403);

    const acceptInterestRes = await api.patch(
      `/investments/${interestId}`,
      {
        status: "accepted",
        founderNotes: "Excited to partner. Opening deal room.",
      },
      founderToken,
    );
    assert.equal(acceptInterestRes.response.status, 200);
    assert.equal(acceptInterestRes.body.data.status, "accepted");
    const acceptedConversationId = acceptInterestRes.body.data.conversationId;
    assert.ok(acceptedConversationId);
    assert.equal(acceptInterestRes.body.data.dealRoomId, acceptedConversationId);
    assert.equal(acceptInterestRes.body.data.dealRoom._id, acceptedConversationId);
    assert.equal(acceptInterestRes.body.conversationId, acceptedConversationId);
    assert.equal(acceptInterestRes.body.dealRoomId, acceptedConversationId);

    const duplicateAcceptedInterestRes = await api.post(
      `/startups/${startupId}/investment-interests`,
      {
        pitchId,
        amountRange: "$1,000,000 - $1,250,000",
        message: "Accepted interests should return the accepted request.",
      },
      investorToken,
    );
    assert.equal(duplicateAcceptedInterestRes.response.status, 200);
    assert.equal(duplicateAcceptedInterestRes.body.data._id, interestId);
    assert.equal(duplicateAcceptedInterestRes.body.data.status, "accepted");
    assert.equal(duplicateAcceptedInterestRes.body.data.conversationId, acceptedConversationId);
    assert.equal(duplicateAcceptedInterestRes.body.data.dealRoomId, acceptedConversationId);
    assert.equal(
      await InvestmentInterest.countDocuments({
        investorId,
        startupId,
        status: { $in: ["pending", "accepted", "founder_review"] },
      }),
      1,
    );

    // 11. Verify the investment deal room was automatically created on Conversation
    const investorDealRoomsRes = await api.get("/investments/deal-rooms", investorToken);
    assert.equal(investorDealRoomsRes.response.status, 200);
    assert.ok(investorDealRoomsRes.body.data.length >= 1);
    const investorDealRoom = investorDealRoomsRes.body.data.find(
      (dealRoom) => dealRoom.investmentInterestId?._id === interestId,
    );
    assert.ok(investorDealRoom);
    assert.equal(investorDealRoom.type, "investment");
    assert.equal(investorDealRoom.investmentDealRoom.status, "accepted");
    assert.equal(investorDealRoom.investmentDealRoom.amountRange, "$100,000 - $250,000");
    assert.equal(investorDealRoom.relatedStartupId._id, startupId);
    assert.equal(investorDealRoom.relatedPitchId._id, pitchId);
    assert.ok(investorDealRoom.participants.some((participant) => participant._id === investorId));
    assert.ok(investorDealRoom.participants.some((participant) => participant._id === founderId));
    const dealRoomId = investorDealRoom._id;
    assert.equal(dealRoomId, acceptedConversationId);
    assert.equal(
      await Conversation.countDocuments({
        participants: { $all: [investorId, founderId], $size: 2 },
        type: "investment",
        relatedStartupId: startupId,
        investmentDealRoom: { $exists: true, $ne: null },
      }),
      1,
    );

    const founderDealRoomsRes = await api.get("/investments/deal-rooms", founderToken);
    assert.equal(founderDealRoomsRes.response.status, 200);
    assert.ok(founderDealRoomsRes.body.data.some((dealRoom) => dealRoom._id === dealRoomId));

    const founderAcceptedInterestsRes = await api.get(
      `/investments?startupId=${startupId}&limit=50`,
      founderToken,
    );
    assert.equal(founderAcceptedInterestsRes.response.status, 200);
    const founderAcceptedInterest = founderAcceptedInterestsRes.body.data.find(
      (interest) => interest._id === interestId,
    );
    assert.equal(founderAcceptedInterest.conversationId, dealRoomId);
    assert.equal(founderAcceptedInterest.dealRoomId, dealRoomId);
    assert.equal(founderAcceptedInterest.dealRoom._id, dealRoomId);

    const investorAcceptedInterestsRes = await api.get(
      "/investments?asInvestor=true&limit=50",
      investorToken,
    );
    assert.equal(investorAcceptedInterestsRes.response.status, 200);
    const investorAcceptedInterest = investorAcceptedInterestsRes.body.data.find(
      (interest) => interest._id === interestId,
    );
    assert.equal(investorAcceptedInterest.conversationId, dealRoomId);
    assert.equal(investorAcceptedInterest.dealRoomId, dealRoomId);

    const openDealRoomFromInterestRes = await api.post(
      "/conversations",
      {
        targetUserId: founderId,
        type: "investment",
        relatedStartupId: startupId,
        investmentInterestId: interestId,
      },
      investorToken,
    );
    assert.equal(openDealRoomFromInterestRes.response.status, 200);
    assert.equal(openDealRoomFromInterestRes.body.data._id, dealRoomId);
    assert.equal(openDealRoomFromInterestRes.body.data.investmentDealRoom.status, "accepted");
    assert.equal(openDealRoomFromInterestRes.body.data.relatedStartupId._id, startupId);
    assert.ok(
      openDealRoomFromInterestRes.body.data.participants.some(
        (participant) => participant._id === investorId,
      ),
    );
    assert.ok(
      openDealRoomFromInterestRes.body.data.participants.some(
        (participant) => participant._id === founderId,
      ),
    );

    const investorOpenDealRoomFromInterestOnlyRes = await api.post(
      "/conversations",
      {
        type: "investment",
        investmentInterestId: interestId,
      },
      investorToken,
    );
    assert.equal(investorOpenDealRoomFromInterestOnlyRes.response.status, 200);
    assert.equal(investorOpenDealRoomFromInterestOnlyRes.body.data._id, dealRoomId);
    assert.ok(
      investorOpenDealRoomFromInterestOnlyRes.body.data.participants.some(
        (participant) => participant._id === founderId,
      ),
    );
    assert.ok(
      investorOpenDealRoomFromInterestOnlyRes.body.data.participants.some(
        (participant) => participant._id === investorId,
      ),
    );

    const founderOpenDealRoomFromInterestOnlyRes = await api.post(
      "/conversations",
      {
        type: "investment",
        investmentInterestId: interestId,
      },
      founderToken,
    );
    assert.equal(founderOpenDealRoomFromInterestOnlyRes.response.status, 200);
    assert.equal(founderOpenDealRoomFromInterestOnlyRes.body.data._id, dealRoomId);

    const investorOpenDealRoomByIdRes = await api.post(
      "/conversations",
      {
        conversationId: dealRoomId,
        targetUserId: founderId,
        type: "investment",
        relatedStartupId: startupId,
        investmentInterestId: interestId,
      },
      investorToken,
    );
    assert.equal(investorOpenDealRoomByIdRes.response.status, 200);
    assert.equal(investorOpenDealRoomByIdRes.body.data._id, dealRoomId);

    const founderOpenDealRoomByIdRes = await api.post(
      "/conversations",
      {
        conversationId: dealRoomId,
        targetUserId: investorId,
        type: "investment",
        relatedStartupId: startupId,
        investmentInterestId: interestId,
      },
      founderToken,
    );
    assert.equal(founderOpenDealRoomByIdRes.response.status, 200);
    assert.equal(founderOpenDealRoomByIdRes.body.data._id, dealRoomId);
    assert.equal(
      await Conversation.countDocuments({
        participants: { $all: [investorId, founderId], $size: 2 },
        type: "investment",
        relatedStartupId: startupId,
        investmentDealRoom: { $exists: true, $ne: null },
      }),
      1,
    );

    const unauthorizedDealRoomRes = await api.get(
      `/investments/deal-rooms/${dealRoomId}`,
      studentToken,
    );
    assert.equal(unauthorizedDealRoomRes.response.status, 404);

    const updateDealRoomRes = await api.patch(
      `/investments/deal-rooms/${dealRoomId}`,
      {
        status: "due_diligence",
        meeting: {
          scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
          location: "Google Meet",
          notes: "Review retention metrics and round timeline.",
        },
        document: {
          title: "Data room index",
          url: "https://example.com/deal-room/index",
          notes: "Private investor diligence folder.",
        },
      },
      investorToken,
    );
    assert.equal(updateDealRoomRes.response.status, 200);
    assert.equal(updateDealRoomRes.body.data.investmentDealRoom.status, "due_diligence");
    assert.equal(updateDealRoomRes.body.data.investmentDealRoom.meeting.location, "Google Meet");
    assert.equal(updateDealRoomRes.body.data.investmentDealRoom.documents.length, 1);
    assert.equal(
      updateDealRoomRes.body.data.investmentDealRoom.documents[0].title,
      "Data room index",
    );

    const dealRoomNotifications = await Notification.find({
      type: "investment_deal_room",
      entityType: "investment_deal_room",
      entityId: dealRoomId,
    });
    assert.ok(
      dealRoomNotifications.some(
        (notification) => notification.recipient.toString() === investorId,
      ),
    );
    assert.ok(
      dealRoomNotifications.some((notification) => notification.recipient.toString() === founderId),
    );

    // 12. Verify deal room conversation appears in the existing message inbox
    const conversationsRes = await api.get("/conversations", investorToken);
    assert.equal(conversationsRes.response.status, 200);
    assert.ok(conversationsRes.body.data.some((conversation) => conversation._id === dealRoomId));

    // 13. Investor sends a message in the deal room using the existing message system
    const sendMsgRes = await api.post(
      `/conversations/${dealRoomId}/messages`,
      {
        content: "Thanks for accepting! Can you share the latest cohort retention metrics?",
      },
      investorToken,
    );
    assert.equal(sendMsgRes.response.status, 201);

    const founderInvestmentAttachmentRes = await sendMultipartMessage({
      conversationId: dealRoomId,
      token: founderToken,
      content: "Sharing the current deck image and diligence file.",
      prefix: "founder-investor",
    });
    assert.equal(
      founderInvestmentAttachmentRes.body.data.content,
      "Sharing the current deck image and diligence file.",
    );
    assert.equal(founderInvestmentAttachmentRes.body.data.attachments.length, 2);

    const investorInvestmentAttachmentRes = await sendMultipartMessage({
      conversationId: dealRoomId,
      token: investorToken,
      content: "",
      prefix: "investor-founder",
    });
    assert.equal(investorInvestmentAttachmentRes.body.data.content, "");
    assert.equal(investorInvestmentAttachmentRes.body.data.attachments.length, 2);

    const investmentImageAttachment = founderInvestmentAttachmentRes.body.data.attachments.find(
      (attachment) => attachment.type === "image/png",
    );
    assert.ok(investmentImageAttachment);
    const investmentAttachmentDownload = await fetchAttachment(
      investmentImageAttachment.url,
      investorToken,
    );
    assert.equal(investmentAttachmentDownload.status, 200);
    assert.equal(investmentAttachmentDownload.headers.get("content-type"), "image/png");
    const unauthorizedAttachmentDownload = await fetchAttachment(
      investmentImageAttachment.url,
      studentToken,
    );
    assert.equal(unauthorizedAttachmentDownload.status, 404);

    const founderDealHistoryRes = await api.get(
      `/conversations/${dealRoomId}/messages`,
      founderToken,
    );
    const investorDealHistoryRes = await api.get(
      `/conversations/${dealRoomId}/messages`,
      investorToken,
    );
    assert.equal(founderDealHistoryRes.response.status, 200);
    assert.equal(investorDealHistoryRes.response.status, 200);
    assert.deepEqual(
      founderDealHistoryRes.body.data.map((message) => message._id),
      investorDealHistoryRes.body.data.map((message) => message._id),
    );
    assert.ok(
      founderDealHistoryRes.body.data.some(
        (message) =>
          message._id === founderInvestmentAttachmentRes.body.data._id &&
          message.attachments.length === 2,
      ),
    );

    const founderSocket = await openMessageSocket(founderToken);
    const investorSocket = await openMessageSocket(investorToken);
    try {
      const realtimeIncoming = waitForSocketMessage(
        founderSocket,
        (payload) => payload.type === "message:new" && payload.conversationId === dealRoomId,
      );
      investorSocket.send(
        JSON.stringify({
          type: "message:send",
          conversationId: dealRoomId,
          content: "Realtime message over WebSocket.",
        }),
      );

      const socketPayload = await realtimeIncoming;
      assert.equal(socketPayload.message.content, "Realtime message over WebSocket.");
      assert.equal(socketPayload.conversationId, dealRoomId);
    } finally {
      founderSocket.close();
      investorSocket.close();
    }

    // 14. Founder creates an Opportunity for students
    const oppRes = await api.post(
      `/startups/${startupId}/opportunities`,
      {
        title: "Fullstack AI Engineer Intern",
        description: "Build reactive UI dashboards and agent event handlers in React 19.",
        type: "internship",
        skills: ["React", "Node.js", "MongoDB", "AI"],
        compensation: "$35/hr + Equity",
        remote: true,
      },
      founderToken,
    );
    assert.equal(oppRes.response.status, 201);
    oppId = oppRes.body.data._id;

    // 15. Student applies to the opportunity
    const applyRes = await api.post(
      `/opportunities/${oppId}/apply`,
      {
        coverMessage:
          "I built several fullstack LLM apps and would love to contribute to HyperScale.",
        portfolioUrl: "https://github.com/student-demo",
      },
      studentToken,
    );
    assert.equal(applyRes.response.status, 201);
    const applicationId = applyRes.body.data._id;

    // 16. Founder reviews applications and accepts the student
    const selfAcceptRes = await api.patch(
      `/applications/${applicationId}`,
      {
        status: "accepted",
      },
      studentToken,
    );
    assert.equal(selfAcceptRes.response.status, 403);

    const reviewAppRes = await api.patch(
      `/applications/${applicationId}`,
      {
        status: "accepted",
      },
      founderToken,
    );
    assert.equal(reviewAppRes.response.status, 200);
    assert.equal(reviewAppRes.body.data.status, "accepted");

    const studentFounderConversationRes = await api.post(
      "/conversations",
      {
        targetUserId: founderId,
        type: "startup",
        relatedStartupId: startupId,
      },
      studentToken,
    );
    assert.equal(studentFounderConversationRes.response.status, 200);
    assert.ok(
      studentFounderConversationRes.body.data.participants.some(
        (participant) => participant._id === studentId,
      ),
    );
    assert.ok(
      studentFounderConversationRes.body.data.participants.some(
        (participant) => participant._id === founderId,
      ),
    );
    assert.ok(
      !studentFounderConversationRes.body.data.participants.some(
        (participant) => participant._id === mentorId,
      ),
    );
    const contactedFounderParticipant = studentFounderConversationRes.body.data.participants.find(
      (participant) => participant._id === founderId,
    );
    assert.equal(
      contactedFounderParticipant.conversationContext.line,
      `Founder • ${startupData.name}`,
    );

    // 17. Founder requests Mentorship from Mentor
    const mentorshipReqRes = await api.post(
      "/mentorships/request",
      {
        mentorId,
        startupId,
        message: "We'd love your advice on pricing our enterprise B2B tier.",
        goals: ["Pricing Strategy", "Sales Cycle"],
      },
      founderToken,
    );
    assert.equal(mentorshipReqRes.response.status, 201);
    mentorshipId = mentorshipReqRes.body.data._id;
    assert.equal(mentorshipReqRes.body.data.startupId._id, startupId);
    assert.equal(mentorshipReqRes.body.data.mentorId._id, mentorId);

    const mentorInboxRes = await api.get("/mentorships?asMentor=true", mentorToken);
    assert.equal(mentorInboxRes.response.status, 200);
    assert.ok(mentorInboxRes.body.data.some((request) => request._id === mentorshipId));

    const duplicateMentorshipRes = await api.post(
      "/mentorships/request",
      {
        mentorId,
        startupId,
        message: "A duplicate active request should not be created.",
      },
      founderToken,
    );
    assert.equal(duplicateMentorshipRes.response.status, 409);

    // 18. Mentor accepts mentorship request
    const acceptMentorRes = await api.patch(
      `/mentorships/${mentorshipId}`,
      {
        status: "accepted",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      },
      mentorToken,
    );
    assert.equal(acceptMentorRes.response.status, 200);
    assert.equal(acceptMentorRes.body.data.status, "accepted");
    assert.equal(acceptMentorRes.body.data.founderId._id, founderId);

    const mentorConversationRes = await api.get("/conversations", mentorToken);
    assert.equal(mentorConversationRes.response.status, 200);
    const founderMentorshipConversation = mentorConversationRes.body.data.find(
      (conversation) =>
        conversation.type === "mentorship" &&
        conversation.relatedStartupId?._id === startupId &&
        conversation.mentorshipWorkspace,
    );
    assert.ok(founderMentorshipConversation);

    const founderMentorWorkspaceOpenRes = await api.post(
      "/conversations",
      {
        conversationId: founderMentorshipConversation._id,
        targetUserId: mentorId,
        type: "mentorship",
        relatedStartupId: startupId,
        mentorshipRequestId: mentorshipId,
      },
      founderToken,
    );
    assert.equal(founderMentorWorkspaceOpenRes.response.status, 200);
    assert.equal(founderMentorWorkspaceOpenRes.body.data._id, founderMentorshipConversation._id);
    const founderMentorParticipant = founderMentorWorkspaceOpenRes.body.data.participants.find(
      (participant) => participant._id === mentorId,
    );
    assert.equal(founderMentorParticipant.conversationContext.line, `Mentor • ${startupData.name}`);

    const founderMentorAttachmentRes = await sendMultipartMessage({
      conversationId: founderMentorshipConversation._id,
      token: founderToken,
      content: "Sharing pitch prep notes and product screenshots.",
      prefix: "founder-mentor",
    });
    assert.equal(founderMentorAttachmentRes.response.status, 201);
    assert.equal(founderMentorAttachmentRes.body.data.attachments.length, 2);

    const mentorFounderAttachmentRes = await sendMultipartMessage({
      conversationId: founderMentorshipConversation._id,
      token: mentorToken,
      content: "",
      prefix: "mentor-founder",
    });
    assert.equal(mentorFounderAttachmentRes.response.status, 201);
    assert.equal(mentorFounderAttachmentRes.body.data.content, "");
    assert.equal(mentorFounderAttachmentRes.body.data.attachments.length, 2);

    const mentorshipDocumentAttachment = mentorFounderAttachmentRes.body.data.attachments.find(
      (attachment) => attachment.type === "application/pdf",
    );
    assert.ok(mentorshipDocumentAttachment);
    const mentorshipAttachmentDownload = await fetchAttachment(
      mentorshipDocumentAttachment.url,
      founderToken,
    );
    assert.equal(mentorshipAttachmentDownload.status, 200);
    assert.equal(mentorshipAttachmentDownload.headers.get("content-type"), "application/pdf");

    const founderMentorHistoryRes = await api.get(
      `/conversations/${founderMentorshipConversation._id}/messages`,
      founderToken,
    );
    const mentorFounderHistoryRes = await api.get(
      `/conversations/${founderMentorshipConversation._id}/messages`,
      mentorToken,
    );
    assert.equal(founderMentorHistoryRes.response.status, 200);
    assert.equal(mentorFounderHistoryRes.response.status, 200);
    assert.deepEqual(
      founderMentorHistoryRes.body.data.map((message) => message._id),
      mentorFounderHistoryRes.body.data.map((message) => message._id),
    );

    const mismatchedMentorWorkspaceTargetRes = await api.post(
      "/conversations",
      {
        conversationId: founderMentorshipConversation._id,
        targetUserId: investorId,
        type: "mentorship",
        relatedStartupId: startupId,
        mentorshipRequestId: mentorshipId,
      },
      founderToken,
    );
    assert.equal(mismatchedMentorWorkspaceTargetRes.response.status, 404);

    // 19. Mentor discovers a startup and requests to mentor the founder
    const mentorStartupRequestRes = await api.post(
      `/mentorships/startups/${studentStartupId}/request`,
      {
        message: "I can help sharpen PMF, prototype milestones, and investor narrative.",
        goals: ["PMF interviews", "Pitch preparation"],
        focusAreas: ["Product/PMF", "Fundraising and pitch preparation", "Technology"],
      },
      mentorToken,
    );
    assert.equal(mentorStartupRequestRes.response.status, 201);
    mentorInitiatedMentorshipId = mentorStartupRequestRes.body.data._id;
    assert.equal(mentorStartupRequestRes.body.data.initiatedBy, "mentor");
    assert.equal(mentorStartupRequestRes.body.data.founderId._id, studentId);
    assert.equal(mentorStartupRequestRes.body.data.startupId._id, studentStartupId);

    const mentorSelfAcceptRes = await api.patch(
      `/mentorships/${mentorInitiatedMentorshipId}`,
      {
        status: "accepted",
      },
      mentorToken,
    );
    assert.equal(mentorSelfAcceptRes.response.status, 403);

    const founderMentorshipInboxRes = await api.get("/mentorships", studentToken);
    assert.equal(founderMentorshipInboxRes.response.status, 200);
    assert.ok(
      founderMentorshipInboxRes.body.data.some(
        (request) => request._id === mentorInitiatedMentorshipId,
      ),
    );

    const founderAcceptsMentorRes = await api.patch(
      `/mentorships/${mentorInitiatedMentorshipId}`,
      {
        status: "accepted",
        scheduledAt: new Date(Date.now() + 3 * 86400000).toISOString(),
        meetingNotes: "Kickoff around PMF experiments and fundraising readiness.",
      },
      studentToken,
    );
    assert.equal(founderAcceptsMentorRes.response.status, 200);
    assert.equal(founderAcceptsMentorRes.body.data.status, "accepted");

    const mentorshipWorkspacesRes = await api.get("/mentorships/workspaces", mentorToken);
    assert.equal(mentorshipWorkspacesRes.response.status, 200);
    const mentorshipWorkspace = mentorshipWorkspacesRes.body.data.find(
      (workspace) => workspace.mentorshipRequestId?._id === mentorInitiatedMentorshipId,
    );
    assert.ok(mentorshipWorkspace);
    mentorshipWorkspaceId = mentorshipWorkspace._id;
    assert.equal(mentorshipWorkspace.type, "mentorship");
    assert.equal(mentorshipWorkspace.relatedStartupId._id, studentStartupId);
    assert.equal(mentorshipWorkspace.mentorshipWorkspace.status, "active");
    assert.deepEqual(mentorshipWorkspace.mentorshipWorkspace.focusAreas, [
      "Product/PMF",
      "Fundraising and pitch preparation",
      "Technology",
    ]);
    assert.ok(mentorshipWorkspace.participants.some((participant) => participant._id === mentorId));
    assert.ok(
      mentorshipWorkspace.participants.some((participant) => participant._id === studentId),
    );

    const unauthorizedMentorshipWorkspaceRes = await api.get(
      `/mentorships/workspaces/${mentorshipWorkspaceId}`,
      investorToken,
    );
    assert.equal(unauthorizedMentorshipWorkspaceRes.response.status, 404);

    const updateMentorshipWorkspaceRes = await api.patch(
      `/mentorships/workspaces/${mentorshipWorkspaceId}`,
      {
        status: "on_track",
        progress: 35,
        meeting: {
          scheduledAt: new Date(Date.now() + 4 * 86400000).toISOString(),
          location: "Zoom",
          agenda: "Review PMF calls and fundraising story.",
          notes: "Founder should bring customer notes and draft deck.",
        },
        mentorNotes: "Strong technical wedge; validate buyer urgency.",
        feedback: "Tighten the ICP and lead with the painful workflow.",
        goal: {
          title: "Complete 10 PMF interviews",
          notes: "Capture buyer pain, budget owner, and current alternatives.",
        },
        milestone: {
          title: "Pitch narrative draft",
          notes: "Problem, wedge, traction, and ask ready for mentor review.",
        },
        resource: {
          title: "PMF interview script",
          url: "https://example.com/pmf-script",
          notes: "Use this for the first customer discovery sprint.",
        },
      },
      mentorToken,
    );
    assert.equal(updateMentorshipWorkspaceRes.response.status, 200);
    assert.equal(updateMentorshipWorkspaceRes.body.data.mentorshipWorkspace.status, "on_track");
    assert.equal(updateMentorshipWorkspaceRes.body.data.mentorshipWorkspace.progress, 35);
    assert.equal(
      updateMentorshipWorkspaceRes.body.data.mentorshipWorkspace.nextSession.location,
      "Zoom",
    );
    assert.equal(updateMentorshipWorkspaceRes.body.data.mentorshipWorkspace.goals.length, 3);
    assert.equal(updateMentorshipWorkspaceRes.body.data.mentorshipWorkspace.milestones.length, 1);
    assert.equal(updateMentorshipWorkspaceRes.body.data.mentorshipWorkspace.resources.length, 1);

    const mentorshipChatRes = await api.post(
      `/conversations/${mentorshipWorkspaceId}/messages`,
      {
        content: "I uploaded the first PMF notes and pitch outline.",
      },
      studentToken,
    );
    assert.equal(mentorshipChatRes.response.status, 201);

    const mentorshipNotifications = await Notification.find({
      recipient: { $in: [mentorId, studentId] },
      entityType: { $in: ["mentorship", "mentorship_workspace", "conversation"] },
    });
    assert.ok(
      mentorshipNotifications.some(
        (notification) =>
          notification.type === "mentorship_request" &&
          notification.recipient.toString() === studentId,
      ),
    );
    assert.ok(
      mentorshipNotifications.some(
        (notification) =>
          notification.type === "mentorship_accepted" &&
          notification.recipient.toString() === mentorId,
      ),
    );
    assert.ok(
      mentorshipNotifications.some(
        (notification) =>
          notification.type === "mentorship_meeting" &&
          notification.recipient.toString() === studentId,
      ),
    );
    assert.ok(
      mentorshipNotifications.some(
        (notification) =>
          notification.type === "mentorship_resource" &&
          notification.recipient.toString() === studentId,
      ),
    );
    // Chat messages must NEVER contaminate the Notification collection
    assert.equal(
      mentorshipNotifications.some(
        (notification) => notification.type === "message" || notification.type === "MESSAGE",
      ),
      false,
    );

    // Unread messages are tracked separately
    const unreadMessagesRes = await api.get("/messages/unread-count", mentorToken);
    assert.equal(unreadMessagesRes.response.status, 200);
    assert.ok(unreadMessagesRes.body.unreadCount >= 1);

    // 20. Switch active role for Founder to Mentor
    const switchRoleRes = await api.patch(
      "/users/me",
      {
        activeRole: "mentor",
      },
      founderToken,
    );
    assert.equal(switchRoleRes.response.status, 200);
    assert.equal(switchRoleRes.body.data.activeRole, "mentor");
  } finally {
    const createdUserIds = [founderId, investorId, investorPeerId, studentId, mentorId].filter(
      Boolean,
    );
    if (createdUserIds.length) {
      await Notification.deleteMany({
        $or: [{ recipient: { $in: createdUserIds } }, { sender: { $in: createdUserIds } }],
      });
      await MentorProfile.deleteMany({ userId: { $in: createdUserIds } });
    }
    if (orphanMentorUserId) {
      await MentorProfile.deleteOne({ userId: orphanMentorUserId });
    }
    await User.deleteMany({
      email: { $in: [founderEmail, investorEmail, investorPeerEmail, studentEmail, mentorEmail] },
    });
    if (startupId) {
      await Startup.deleteOne({ _id: startupId });
      await StartupMembership.deleteMany({ startupId });
    }
    if (pitchId) {
      await Pitch.deleteOne({ _id: pitchId });
      await PitchLike.deleteMany({ pitchId });
    }
    if (studentPitchId) {
      await Pitch.deleteOne({ _id: studentPitchId });
      await PitchLike.deleteMany({ pitchId: studentPitchId });
    }
    if (oppId) {
      await Opportunity.deleteOne({ _id: oppId });
      await Application.deleteMany({ opportunityId: oppId });
    }
    if (studentStartupId) {
      await Startup.deleteOne({ _id: studentStartupId });
      await StartupMembership.deleteMany({ startupId: studentStartupId });
    }
    if (interestId) await InvestmentInterest.deleteOne({ _id: interestId });
    if (ignoredInterestId) await InvestmentInterest.deleteOne({ _id: ignoredInterestId });
    if (createdUserIds.length) {
      await Message.deleteMany({ senderId: { $in: createdUserIds } });
    }
    if (createdUserIds.length) {
      await Conversation.deleteMany({ participants: { $in: createdUserIds } });
    }
    if (mentorshipId) await MentorshipRequest.deleteOne({ _id: mentorshipId });
    if (mentorInitiatedMentorshipId) {
      await MentorshipRequest.deleteOne({ _id: mentorInitiatedMentorshipId });
    }
  }
});

const TEST_IMAGE_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);
const TEST_PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

function buildMessageForm({ content, prefix }) {
  const form = new FormData();
  if (content !== undefined) form.set("content", content);
  form.append("attachments", new Blob([TEST_IMAGE_BYTES], { type: "image/png" }), `${prefix}.png`);
  form.append(
    "attachments",
    new Blob([TEST_PDF_BYTES], { type: "application/pdf" }),
    `${prefix}.pdf`,
  );
  return form;
}

async function sendMultipartMessage({ conversationId, token, content, prefix }) {
  return api.postForm(
    `/conversations/${conversationId}/messages`,
    buildMessageForm({ content, prefix }),
    token,
  );
}

async function fetchAttachment(url, token) {
  const attachmentUrl = /^https?:\/\//i.test(url)
    ? url
    : `${getApiUrl().replace(/\/+$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
  const response = await fetch(attachmentUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  await response.arrayBuffer();
  return response;
}

function openMessageSocket(token) {
  const url = new URL(getApiUrl());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/messages";
  url.searchParams.set("token", token);

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url.toString());
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Timed out opening message WebSocket."));
    }, 2000);

    socket.once("message", (raw) => {
      const payload = JSON.parse(raw.toString());
      if (payload.type !== "connection:ready") {
        reject(new Error("Message WebSocket did not become ready."));
        return;
      }
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function waitForSocketMessage(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("message", handleMessage);
      reject(new Error("Timed out waiting for WebSocket message."));
    }, 2500);

    function handleMessage(raw) {
      const payload = JSON.parse(raw.toString());
      if (!predicate(payload)) return;

      clearTimeout(timeout);
      socket.off("message", handleMessage);
      resolve(payload);
    }

    socket.on("message", handleMessage);
  });
}
