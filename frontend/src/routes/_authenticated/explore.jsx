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
  errorComponent: ({ error, reset }) => (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-bold">Failed to load directory</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error?.message || "An unexpected error occurred."}</p>
      <button
        onClick={() => reset()}
        className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Try again
      </button>
    </div>
  ),
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
