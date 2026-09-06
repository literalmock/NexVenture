import mongoose from "mongoose";
import { COMPANIES } from "../../frontend/src/data/companies.js";
import { connectDB } from "../config/db.js";
import MentorProfile from "../models/MentorProfile.js";
import Notification from "../models/Notification.js";
import Opportunity from "../models/Opportunity.js";
import Pitch from "../models/Pitch.js";
import Post from "../models/Post.js";
import Startup from "../models/Startup.js";
import StartupMembership from "../models/StartupMembership.js";
import User from "../models/User.js";
import { hashPassword } from "../utils/password.js";

const DUMMY_PASSWORD = "Nex@1234";

const CORE_USERS = [
  {
    name: "Alex Founder",
    email: "founder@nexventure.dev",
    role: "founder",
    roles: ["founder", "mentor"],
    headline: "Founder & CEO @ EcoVolt ⚡ Clean Energy for Everyone",
    bio: "Serial entrepreneur. Previously at Google. Building EcoVolt — next-gen clean energy software.",
    location: "Bengaluru, India",
    skills: ["Product Strategy", "Fundraising", "Team Building", "CleanTech", "React"],
    interests: ["CleanTech", "B2B SaaS", "Impact Investing"],
    linkedStartupId: "ecovolt",
  },
  {
    name: "Priya Mentor",
    email: "mentor@nexventure.dev",
    role: "mentor",
    roles: ["mentor"],
    headline: "Ex-CTO • Helping founders scale past 0→1",
    bio: "20+ years in software engineering. I mentor early-stage founders on product, tech, and go-to-market.",
    location: "Mumbai, India",
    skills: ["Engineering Leadership", "Product-Market Fit", "Scaling Teams", "Cloud Architecture"],
    interests: ["SaaS", "Developer Tools", "EdTech"],
  },
  {
    name: "Sam Student",
    email: "student@nexventure.dev",
    role: "student",
    roles: ["student"],
    headline: "CS @ IIT Delhi • Building fullstack & ML apps",
    bio: "Passionate about startups, open source, and ML. Looking to join an early-stage team.",
    location: "Delhi, India",
    skills: ["React", "Node.js", "Python", "Machine Learning", "TailwindCSS"],
    interests: ["FinTech", "AI/ML", "Web3"],
  },
  {
    name: "Rahul Investor",
    email: "investor@nexventure.dev",
    role: "investor",
    roles: ["investor"],
    headline: "Partner @ Northstar Ventures • Seed & Series A",
    bio: "Investing in ambitious founders solving real problems. Focus: B2B SaaS, FinTech, CleanTech.",
    location: "Bangalore, India",
    skills: ["Due Diligence", "Portfolio Management", "Fundraising", "Venture Capital"],
    interests: ["B2B SaaS", "FinTech", "Climate"],
  },
];

const COMPANY_FOUNDERS = COMPANIES.map((c) => {
  const firstName = c.founder.split(" ")[0].toLowerCase();
  return {
    name: c.founder,
    email: `${firstName}@${c.id}.dev`,
    role: "founder",
    roles: ["founder"],
    headline: `Founder & CEO @ ${c.name} • ${c.founderRole}`,
    bio: `${c.description} Founded in ${c.founded}, located in ${c.location}.`,
    location: c.location,
    skills: [c.industry, "Product", "Leadership", "Fundraising"],
    interests: [c.industry, "Startups", "Scale"],
    linkedStartupId: c.id,
  };
});

async function seed() {
  try {
    await connectDB();
    console.log("\n🌱 Starting full ecosystem seed process...\n");

    const userMap = {};
    const ALL_USERS_TO_SEED = [...CORE_USERS, ...COMPANY_FOUNDERS];

    for (const userData of ALL_USERS_TO_SEED) {
      let user = await User.findOne({ email: userData.email });

      if (user) {
        user.name = userData.name;
        user.headline = userData.headline;
        user.bio = userData.bio;
        user.location = userData.location;
        user.skills = userData.skills;
        user.interests = userData.interests;
        user.linkedStartupId = userData.linkedStartupId || null;
        user.roles = userData.roles || [userData.role];
        user.activeRole = userData.role;
        user.role = userData.role;
        user.passwordHash = hashPassword(DUMMY_PASSWORD);
        await user.save();
      } else {
        user = await User.create({
          ...userData,
          activeRole: userData.role,
          passwordHash: hashPassword(DUMMY_PASSWORD),
          roles: userData.roles || [userData.role],
          authProviders: ["local"],
          onboardingComplete: true,
        });
      }

      userMap[userData.email] = user;
    }

    const alexFounder = userMap["founder@nexventure.dev"];
    const rahulInvestor = userMap["investor@nexventure.dev"];
    const priyaMentor = userMap["mentor@nexventure.dev"];
    const samStudent = userMap["student@nexventure.dev"];
    const sophieMorrow = userMap["sophie@morrow.dev"];

    // Mentor Profile for Priya
    if (priyaMentor) {
      await MentorProfile.findOneAndUpdate(
        { userId: priyaMentor._id },
        {
          userId: priyaMentor._id,
          expertise: ["SaaS Architecture", "Seed Fundraising", "Engineering Leadership", "GTM"],
          industries: ["Developer Tools", "B2B SaaS", "EdTech"],
          experience: 15,
          bio: "Ex-CTO at high-growth SaaS. Mentored 30+ YC and Techstars founders on scaling tech stacks and building remote engineering cultures.",
          availability: "4 hrs / week",
          sessionDuration: "45 mins",
          pricingType: "free",
          sessionPrice: 0,
          rating: 4.9,
          isVerified: true,
        },
        { upsert: true },
      );
    }

    // Upsert Startups & Pitches
    for (const company of COMPANIES) {
      const founderFirstName = company.founder.split(" ")[0].toLowerCase();
      const founder = userMap[`${founderFirstName}@${company.id}.dev`] || alexFounder;

      const startup = await Startup.findOneAndUpdate(
        { id: company.id },
        {
          ...company,
          slug: company.id,
          founderIds: [founder._id],
          ownerId: founder._id,
          tagline: company.description.slice(0, 100),
          problem: `Current solutions in ${company.industry} suffer from legacy fragmentation and slow iteration cycles.`,
          solution: `${company.name} delivers modern, real-time infrastructure tailored for rapid scale.`,
          traction: "Growing 25% MoM with strong retention metrics across early adopters.",
          fundingRaised: company.funding,
          fundingGoal: "$1,500,000",
          teamSize: company.team || 3,
        },
        { upsert: true, returnDocument: "after" },
      );

      // Membership
      await StartupMembership.findOneAndUpdate(
        { startupId: startup._id, userId: founder._id },
        {
          startupId: startup._id,
          userId: founder._id,
          role: "founder",
          title: company.founderRole || "Founder & CEO",
          status: "active",
        },
        { upsert: true },
      );

      // Pitch
      await Pitch.findOneAndUpdate(
        { startupId: startup._id },
        {
          startupId: startup._id,
          founderId: founder._id,
          title: `${company.name}: Transforming ${company.industry}`,
          elevatorPitch: `${company.name} is the modern operating layer for ${company.industry}. Built for scale and speed.`,
          problem: `Legacy tools in ${company.industry} create massive friction for engineering and operations teams.`,
          solution: `An end-to-end platform enabling 10x faster execution with automated workflows.`,
          market: `Global TAM of $45B+ expanding at 18% CAGR.`,
          traction: `Live with 50+ enterprise pilot customers and $35k MRR.`,
          fundingAsk: "$1,500,000",
          valuation: "$12,000,000",
          status: "published",
          views: 142,
          likesCount: 18,
        },
        { upsert: true },
      );

      // Create Opportunities for a few startups
      if (["morrow", "aerloop", "arcwell", "kinetix"].includes(company.id)) {
        await Opportunity.findOneAndUpdate(
          { startupId: startup._id, title: "Fullstack AI Engineer" },
          {
            startupId: startup._id,
            createdBy: founder._id,
            title: "Fullstack AI Engineer",
            description: `Help build core user workflows and real-time features for ${company.name}.`,
            type: "internship",
            skills: ["React", "Node.js", "MongoDB", "Tailwind CSS"],
            compensationType: "paid",
            compensation: "$30 - $45 / hr",
            remote: true,
            location: "Remote",
            status: "open",
          },
          { upsert: true },
        );
      }
    }
    console.log(
      `  🏢 Upserted ${COMPANIES.length} startups with published pitches & opportunities.`,
    );

    // Seed Posts
    const postCount = await Post.countDocuments();
    if (postCount < 3) {
      if (sophieMorrow) {
        await Post.create({
          author: sophieMorrow._id,
          authorRole: "founder",
          content:
            "📚 Big update from Morrow: Our adaptive learning plans were piloted in 120 new classrooms this month! Seeing 49% student engagement lift. Looking for early-stage EdTech angel investors and pedagogy advisors.",
          tags: ["EdTech", "Morrow", "Milestone", "Classrooms"],
          likes: [rahulInvestor._id, priyaMentor._id],
          comments: [
            {
              author: rahulInvestor._id,
              authorRole: "investor",
              content:
                "Huge traction in Toronto Sophie! Sent an intro request to discuss your Seed round.",
            },
          ],
        });
      }

      if (alexFounder) {
        await Post.create({
          author: alexFounder._id,
          authorRole: "founder",
          content:
            "🚀 Super excited to announce that EcoVolt just crossed 10,000 active clean energy consumers! Our battery degradation algorithm is now 38% more efficient than industry standards.",
          tags: ["CleanTech", "Milestone", "Fundraising", "EcoVolt"],
          likes: [rahulInvestor._id, priyaMentor._id],
          comments: [
            {
              author: rahulInvestor._id,
              authorRole: "investor",
              content:
                "Incredible growth Alex! Let's connect this week to discuss your Seed metrics.",
            },
          ],
        });
      }
    }

    console.log("\n🎉 Full Founder & Company Seeding complete!\n");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seed();
