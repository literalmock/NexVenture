/**
 * Seed Script — creates dummy users for all roles, initial posts, comments,
 * and realistic pending introduction requests / notifications.
 *
 * Run with: npm run seed (from the backend/ directory)
 *
 * Credentials created:
 *   founder@nexventure.dev  / Nex@1234
 *   mentor@nexventure.dev   / Nex@1234
 *   student@nexventure.dev  / Nex@1234
 *   investor@nexventure.dev / Nex@1234
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Notification from "../models/Notification.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { hashPassword } from "../utils/password.js";

const DUMMY_PASSWORD = "Nex@1234";

const SEED_USERS = [
  {
    name: "Alex Founder",
    email: "founder@nexventure.dev",
    role: "founder",
    headline: "Founder & CEO @ EcoVolt ⚡ Clean Energy for Everyone",
    bio: "Serial entrepreneur. Previously at Google. Now building EcoVolt — clean energy for everyone.",
    location: "Bengaluru, India",
    skills: ["Product Strategy", "Fundraising", "Team Building", "CleanTech"],
    interests: ["CleanTech", "B2B SaaS", "Impact Investing"],
    linkedStartupId: "ecovolt",
  },
  {
    name: "Priya Mentor",
    email: "mentor@nexventure.dev",
    role: "mentor",
    headline: "Ex-CTO • Helping founders scale past 0→1",
    bio: "20+ years in software engineering. I mentor early-stage founders on product, tech, and go-to-market.",
    location: "Mumbai, India",
    skills: ["Engineering Leadership", "Product-Market Fit", "Scaling Teams"],
    interests: ["SaaS", "Developer Tools", "EdTech"],
  },
  {
    name: "Sam Student",
    email: "student@nexventure.dev",
    role: "student",
    headline: "CS @ IIT Delhi • Building fullstack & ML apps",
    bio: "Passionate about startups, open source, and ML. Looking to join an early-stage team.",
    location: "Delhi, India",
    skills: ["React", "Node.js", "Python", "Machine Learning"],
    interests: ["FinTech", "AI/ML", "Web3"],
  },
  {
    name: "Rahul Investor",
    email: "investor@nexventure.dev",
    role: "investor",
    headline: "Partner @ Northstar Ventures • Seed & Series A",
    bio: "Investing in ambitious founders solving real problems. Focus: B2B SaaS, FinTech, CleanTech.",
    location: "Bangalore, India",
    skills: ["Due Diligence", "Portfolio Management", "Fundraising"],
    interests: ["B2B SaaS", "FinTech", "Climate"],
  },
];

async function seed() {
  try {
    await connectDB();
    console.log("\n🌱 Starting full ecosystem seed process...\n");

    const userMap = {};

    for (const userData of SEED_USERS) {
      let user = await User.findOne({ email: userData.email });

      if (user) {
        user.name = userData.name;
        user.headline = userData.headline;
        user.bio = userData.bio;
        user.location = userData.location;
        user.skills = userData.skills;
        user.interests = userData.interests;
        user.linkedStartupId = userData.linkedStartupId || null;
        user.roles = [userData.role];
        user.passwordHash = hashPassword(DUMMY_PASSWORD);
        await user.save();
        console.log(`  🔄 Updated  ${userData.email}  [${userData.role}]`);
      } else {
        user = await User.create({
          ...userData,
          passwordHash: hashPassword(DUMMY_PASSWORD),
          roles: [userData.role],
          authProviders: ["local"],
          onboardingComplete: true,
        });
        console.log(`  ✅ Created  ${userData.email}  [${userData.role}]`);
      }

      userMap[userData.role] = user;
    }

    // Seed Initial Community Posts if feed has fewer than 3 posts
    const postCount = await Post.countDocuments();
    if (postCount < 3) {
      console.log("\n📝 Seeding initial community feed posts...");

      const post1 = await Post.create({
        author: userMap.founder._id,
        authorRole: "founder",
        content:
          "🚀 Super excited to announce that EcoVolt just crossed 10,000 active clean energy consumers! Our battery degradation algorithm is now 38% more efficient than industry standards. Huge shoutout to the team and mentors on NEXVENTURE who helped us refine our GTM. Raising our Seed round soon — open to warm intros!",
        tags: ["CleanTech", "Milestone", "Fundraising", "EcoVolt"],
        likes: [userMap.investor._id, userMap.mentor._id],
        comments: [
          {
            author: userMap.investor._id,
            authorRole: "investor",
            content:
              "Incredible growth Alex! Let's connect this week to discuss your Seed metrics.",
          },
          {
            author: userMap.mentor._id,
            authorRole: "mentor",
            content: "Proud of the momentum here! The hardware telemetry pivots really paid off.",
          },
        ],
      });

      const post2 = await Post.create({
        author: userMap.investor._id,
        authorRole: "investor",
        content:
          "💡 Northstar Ventures Thesis for Q3: We are aggressively deploying $500K–$1.5M cheques into pre-seed and seed founders building vertical AI workflows for industrial operations and green logistics. If your pilot customers love your product, drop a request intro!",
        tags: ["VentureCapital", "Investing", "B2BSaaS", "Thesis"],
        likes: [userMap.founder._id],
        comments: [
          {
            author: userMap.founder._id,
            authorRole: "founder",
            content: "Sent over our deck and traction memo Rahul!",
          },
        ],
      });

      const post3 = await Post.create({
        author: userMap.mentor._id,
        authorRole: "mentor",
        content:
          "🎯 Common mistake I see in early-stage pitch decks: focusing 80% on product features and 20% on distribution. In 2026, CAC is king. Show investors your proprietary channel advantage before you dive into architecture details.",
        tags: ["FounderAdvice", "Startups", "GTM", "Mentorship"],
        likes: [userMap.student._id, userMap.founder._id],
        comments: [
          {
            author: userMap.student._id,
            authorRole: "student",
            content: "Bookmarked! Very actionable advice Priya.",
          },
        ],
      });

      console.log("  ✅ Seeded 3 community posts with likes & comments.");
    }

    // Seed Initial Notifications for Alex Founder
    const notifCount = await Notification.countDocuments({ recipient: userMap.founder._id });
    if (notifCount === 0) {
      console.log("\n🔔 Seeding initial pending requests & notifications for Founder...");

      await Notification.create({
        recipient: userMap.founder._id,
        sender: userMap.investor._id,
        type: "intro_request",
        title: "Introduction Request from Rahul Investor",
        message:
          "Rahul Investor (Partner @ Northstar Ventures) is interested in EcoVolt's clean energy traction and requested a 20-min pitch discussion.",
        startupId: "ecovolt",
        startupName: "EcoVolt",
        status: "pending",
        read: false,
      });

      await Notification.create({
        recipient: userMap.founder._id,
        sender: userMap.student._id,
        type: "application",
        title: "Job Application: Full-Stack Intern",
        message:
          "Sam Student applied for the Frontend / Full-Stack Engineer position at EcoVolt. Review portfolio & profile.",
        startupId: "ecovolt",
        startupName: "EcoVolt",
        status: "pending",
        read: false,
      });

      await Notification.create({
        recipient: userMap.founder._id,
        sender: userMap.mentor._id,
        type: "mentorship",
        title: "Mentorship Session Confirmation",
        message:
          "Priya Mentor accepted your request for Founder Office Hours on Sep 12 at 11:00 AM.",
        status: "read",
        read: false,
      });

      console.log("  ✅ Seeded 3 notifications (2 pending requests, 1 update).");
    }

    console.log("\n🎉 Ecosystem Seeding complete!\n");
    console.log("─────────────────────────────────────────");
    console.log("  Dummy Credentials (password: Nex@1234)");
    console.log("─────────────────────────────────────────");
    for (const u of SEED_USERS) {
      console.log(`  ${u.role.padEnd(10)} → ${u.email}`);
    }
    console.log("─────────────────────────────────────────\n");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seed();
