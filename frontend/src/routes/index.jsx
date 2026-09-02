import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Navbar } from "@/components/nex/Navbar";
import { Hero } from "@/components/nex/Hero";
import { Trust } from "@/components/nex/Trust";
import { Features } from "@/components/nex/Features";
import {
  StartupDashboardPreview,
  InvestorDashboardPreview,
} from "@/components/nex/DashboardPreviews";
import { Stats } from "@/components/nex/Stats";
import { Testimonials } from "@/components/nex/Testimonials";
import { CTA } from "@/components/nex/CTA";
import { Footer } from "@/components/nex/Footer";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXVENTURE — Build. Connect. Fund." },
      {
        name: "description",
        content:
          "Where founders showcase startups, investors discover deals, mentors guide teams and students join the next unicorn.",
      },
      { property: "og:title", content: "NEXVENTURE — Build. Connect. Fund." },
      {
        property: "og:description",
        content: "The all-in-one startup ecosystem for founders, investors, mentors and students.",
      },
    ],
  }),
  component: Index,
});
function Index() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative min-h-screen overflow-x-clip"
    >
      <Navbar />
      <Hero />
      <Trust />
      <Features />
      <StartupDashboardPreview />
      <InvestorDashboardPreview />
      <Stats />
      <Testimonials />
      <CTA />
      <Footer />
    </motion.main>
  );
}
