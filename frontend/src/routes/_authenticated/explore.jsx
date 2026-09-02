import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FiMenu } from "react-icons/fi";
import { WorkspaceSidebar } from "@/components/nex/WorkspaceSidebar";
import { StartupDirectory } from "@/routes/startups";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Explore Startups — NEXVENTURE" },
      { name: "description", content: "Discover startups across the NEXVENTURE ecosystem." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <WorkspaceSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <button
        type="button"
        aria-label="Open sidebar"
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-20 flex size-10 items-center justify-center rounded-xl border border-border bg-card/90 shadow-sm backdrop-blur lg:hidden"
      >
        <FiMenu className="size-4" />
      </button>
      <StartupDirectory showNavbar={false} workspace />
    </div>
  );
}
