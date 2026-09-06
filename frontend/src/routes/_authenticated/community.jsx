import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FiMenu, FiUsers } from "react-icons/fi";
import { NotificationBell } from "@/components/nex/NotificationBell";
import { PostComposer } from "@/components/nex/PostComposer";
import { PostFeed } from "@/components/nex/PostFeed";
import { WorkspaceSidebar } from "@/components/nex/WorkspaceSidebar";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — NEXVENTURE" },
      { name: "description", content: "Updates, wins, and questions from the whole ecosystem." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [latestPost, setLatestPost] = useState(null);

  return (
    <div className="relative flex min-h-screen bg-background">
      <WorkspaceSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex-1 lg:pl-64">
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 px-4 sm:px-6">
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-card lg:hidden"
          >
            <FiMenu className="size-4" />
          </button>
          <div>
            <p className="font-display text-sm font-bold">Community</p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Updates, wins, and questions from the whole ecosystem.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <NotificationBell />
          </div>
        </header>

        <main className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass gradient-border flex items-center gap-3 rounded-3xl p-5"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FiUsers className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Hey {user?.name?.split(" ")[0] ?? "there"} 👋</p>
              <p className="text-xs text-muted-foreground">
                Share a milestone, ask a question, or catch up on what founders, investors, mentors,
                and students are building.
              </p>
            </div>
          </motion.div>

          <PostComposer onPostCreated={(post) => setLatestPost(post)} />
          <PostFeed newPost={latestPost} />
        </main>
      </div>
    </div>
  );
}
