import {
  FiBookmark,
  FiCalendar,
  FiCompass,
  FiGrid,
  FiLogOut,
  FiMessageSquare,
  FiMessageCircle,
  FiSettings,
  FiTrendingUp,
  FiBriefcase,
  FiUsers,
  FiAward,
  FiFileText,
  FiDollarSign,
  FiPieChart,
} from "react-icons/fi";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/nex/Logo";
import { useAuth } from "@/lib/auth";
import { USER_ROLE_BADGES } from "@/utils/enums";
import { cn } from "@/lib/utils";

// Role-specific navigation items
const NAV_BY_ROLE = {
  founder: [
    { label: "Dashboard", icon: FiGrid, to: "/dashboard" },
    { label: "Explore", icon: FiCompass, to: "/explore" },
    { label: "Community", icon: FiMessageCircle, to: "/community" },
    { label: "My Startup", icon: FiBriefcase, to: "/workspace/startup" },
    { label: "Pitch", icon: FiFileText, to: "/workspace/pitch" },
    { label: "Investors", icon: FiTrendingUp, to: "/workspace/investors" },
    { label: "Mentors", icon: FiUsers, to: "/workspace/mentors" },
    { label: "Opportunities", icon: FiAward, to: "/workspace/opportunities" },
    { label: "Analytics", icon: FiPieChart, to: "/workspace/analytics" },
    { label: "Events", icon: FiCalendar, to: "/workspace/events" },
    { label: "Messages", icon: FiMessageSquare, to: "/workspace/messages" },
    { label: "Bookmarks", icon: FiBookmark, to: "/workspace/bookmarks" },
    { label: "Settings", icon: FiSettings, to: "/workspace/settings" },
  ],
  investor: [
    { label: "Dashboard", icon: FiGrid, to: "/dashboard" },
    { label: "Explore", icon: FiCompass, to: "/explore" },
    { label: "Community", icon: FiMessageCircle, to: "/community" },
    { label: "Deal Flow", icon: FiDollarSign, to: "/workspace/investors" },
    { label: "Portfolio", icon: FiPieChart, to: "/workspace/bookmarks" },
    { label: "Events", icon: FiCalendar, to: "/workspace/events" },
    { label: "Messages", icon: FiMessageSquare, to: "/workspace/messages" },
    { label: "Settings", icon: FiSettings, to: "/workspace/settings" },
  ],
  mentor: [
    { label: "Dashboard", icon: FiGrid, to: "/dashboard" },
    { label: "Explore", icon: FiCompass, to: "/explore" },
    { label: "Community", icon: FiMessageCircle, to: "/community" },
    { label: "Mentorship", icon: FiUsers, to: "/workspace/mentors" },
    { label: "Sessions", icon: FiCalendar, to: "/workspace/events" },
    { label: "Resources", icon: FiFileText, to: "/workspace/bookmarks" },
    { label: "Messages", icon: FiMessageSquare, to: "/workspace/messages" },
    { label: "Settings", icon: FiSettings, to: "/workspace/settings" },
  ],
  student: [
    { label: "Dashboard", icon: FiGrid, to: "/dashboard" },
    { label: "Explore", icon: FiCompass, to: "/explore" },
    { label: "Community", icon: FiMessageCircle, to: "/community" },
    { label: "Opportunities", icon: FiAward, to: "/workspace/opportunities" },
    { label: "Applications", icon: FiFileText, to: "/workspace/applications" },
    { label: "Events", icon: FiCalendar, to: "/workspace/events" },
    { label: "Messages", icon: FiMessageSquare, to: "/workspace/messages" },
    { label: "Settings", icon: FiSettings, to: "/workspace/settings" },
  ],
};

export function WorkspaceSidebar({ open, onClose }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const activeRole = user?.activeRole || user?.role;
  const navItems = NAV_BY_ROLE[activeRole] ?? NAV_BY_ROLE.founder;
  const badge = USER_ROLE_BADGES[activeRole] ?? "Member";
  const initials = (user?.name ?? "N")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleSignOut() {
    signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
        />
      ) : null}
      <aside
        className={cn(
          "glass fixed inset-y-0 left-0 z-40 flex w-64 flex-col p-4 transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Logo />
          <span className="font-display text-[15px] font-bold tracking-tight">NEXVENTURE</span>
        </div>

        {/* Role badge */}
        <div className="mt-4 mx-2 flex items-center gap-2.5 rounded-xl bg-primary/8 px-3 py-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg [background-image:var(--gradient-brand)] text-[11px] font-bold text-primary-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight">{user?.name}</p>
            <p className="text-[11px] text-primary font-medium">{badge}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-5 flex-1 space-y-0.5" aria-label="Workspace navigation">
          {navItems.map((item) => {
            const active =
              item.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.to);
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  onClose?.();
                  if (item.to) navigate({ to: item.to });
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:translate-x-0.5 hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className={cn("size-4", active && "text-primary")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <FiLogOut className="size-4" /> Logout
        </button>
      </aside>
    </>
  );
}
