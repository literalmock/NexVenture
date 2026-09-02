import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FiArrowRight, FiCheck, FiMapPin } from "react-icons/fi";
import { HiOutlineAcademicCap, HiOutlineLightBulb, HiOutlineRocketLaunch } from "react-icons/hi2";
import { FiDollarSign } from "react-icons/fi";
import { Aurora } from "@/components/nex/Aurora";
import { Logo } from "@/components/nex/Logo";
import { Field } from "@/components/nex/AuthShell";
import { NexButton } from "@/components/nex/primitives";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  {
    id: "founder",
    label: "Founder",
    icon: HiOutlineRocketLaunch,
    description: "Build a company, meet investors, and hire your earliest team.",
  },
  {
    id: "investor",
    label: "Investor",
    icon: FiDollarSign,
    description: "Build thesis-led deal flow and track companies worth conviction.",
  },
  {
    id: "mentor",
    label: "Mentor",
    icon: HiOutlineLightBulb,
    description: "Advise ambitious operators and share hard-earned experience.",
  },
  {
    id: "student",
    label: "Student",
    icon: HiOutlineAcademicCap,
    description: "Find startup roles, mentors, communities, and real projects.",
  },
];

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [{ title: "Build your profile — NEXVENTURE" }, { name: "robots", content: "noindex" }],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, completeOnboarding, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState(user?.roles?.length ? user.roles : []);
  const [headline, setHeadline] = useState(user?.headline || "");
  const [location, setLocation] = useState(user?.location || "");
  const [validationError, setValidationError] = useState("");

  function toggleRole(role) {
    clearError();
    setValidationError("");
    setRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (!roles.length) {
      setValidationError("Select at least one role to shape your workspace.");
      return;
    }
    try {
      await completeOnboarding({ roles, headline, location });
      navigate({ to: "/dashboard", replace: true });
    } catch {
      // AuthContext displays the API error.
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-8 lg:px-12">
      <Aurora intensity={0.6} />
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-[0.07]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-sm font-bold tracking-tight">NEXVENTURE</span>
          <span className="ml-auto rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            Profile setup · 1 minute
          </span>
        </div>

        <form onSubmit={submit} className="mt-10 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <motion.section
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            className="self-start lg:sticky lg:top-10"
          >
            <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">Your orbit</p>
            <h1 className="mt-4 max-w-lg text-4xl leading-[0.98] font-semibold sm:text-5xl">
              Tell us which side of the table you sit on.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Select every role that applies. Your first selection becomes the primary workspace,
              and you can change it later in Settings.
            </p>
            <div className="mt-8 rounded-2xl border border-border/80 bg-card/65 p-4 backdrop-blur">
              <p className="text-xs font-semibold text-muted-foreground">Signed in as</p>
              <div className="mt-3 flex items-center gap-3">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="size-10 rounded-xl object-cover" />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-xl [background-image:var(--gradient-brand)] text-sm font-bold text-white">
                    {user?.name?.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="glass gradient-border rounded-[2rem] p-5 sm:p-7"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLE_OPTIONS.map((option, index) => {
                const selected = roles.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleRole(option.id)}
                    aria-pressed={selected}
                    className={cn(
                      "group relative min-h-44 overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200",
                      selected
                        ? "-translate-y-1 border-primary bg-primary/8 shadow-[var(--shadow-lift)]"
                        : "border-border bg-card/80 hover:-translate-y-1 hover:border-foreground/25",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl transition-colors",
                        selected
                          ? "[background-image:var(--gradient-brand)] text-white"
                          : "bg-secondary",
                      )}
                    >
                      <option.icon className="size-5" />
                    </span>
                    <p className="mt-5 font-display text-lg font-bold">{option.label}</p>
                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </p>
                    {selected ? (
                      <span className="absolute top-4 right-4 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <FiCheck className="size-3.5" />
                      </span>
                    ) : null}
                    {selected && index === 0 ? null : null}
                  </button>
                );
              })}
            </div>

            {validationError ? (
              <p className="mt-3 text-xs text-destructive">{validationError}</p>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Professional headline"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Founder building climate infrastructure"
                maxLength={120}
              />
              <Field
                label="Location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Bengaluru, India"
                maxLength={80}
                className="pl-10"
              />
            </div>
            <div className="pointer-events-none relative -mt-[2.45rem] ml-3.5 hidden w-fit text-muted-foreground sm:block">
              <FiMapPin className="size-4" />
            </div>

            {error ? (
              <div className="mt-6 rounded-xl border border-destructive/25 bg-destructive/8 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="mt-7 flex items-center justify-between gap-4 border-t border-border pt-5">
              <p className="hidden text-xs text-muted-foreground sm:block">
                Your choices personalize discovery and recommendations.
              </p>
              <NexButton type="submit" disabled={isLoading} className="ml-auto min-w-44">
                {isLoading ? "Saving profile…" : "Enter my workspace"}
                {!isLoading ? <FiArrowRight className="size-4" /> : null}
              </NexButton>
            </div>
          </motion.section>
        </form>
      </div>
    </main>
  );
}
