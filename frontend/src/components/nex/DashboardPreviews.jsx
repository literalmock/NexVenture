import { motion } from "framer-motion";
import { FiArrowUpRight, FiBriefcase, FiTrendingUp, FiUsers } from "react-icons/fi";
import { Section, SectionHeading, Reveal } from "./primitives";
import { Sparkline } from "./Sparkline";
function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1.5 font-display text-xl font-bold">{value}</p>
      {hint ? <p className="text-[11px] text-success">{hint}</p> : null}
    </div>
  );
}
export function StartupDashboardPreview() {
  return (
    <Section id="startups">
      <SectionHeading
        eyebrow="For founders"
        title={<>Your startup command center</>}
        subtitle="Track funding momentum, interest and team applications from a single view."
      />

      <Reveal className="mt-14">
        <div className="glass gradient-border overflow-hidden rounded-[2rem] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl [background-image:var(--gradient-brand)]">
                <FiBriefcase className="size-4 text-primary-foreground" />
              </span>
              <div>
                <p className="font-display text-base font-bold">AI HealthCare</p>
                <p className="text-xs text-muted-foreground">
                  Series Seed · HealthTech · Bengaluru
                </p>
              </div>
            </div>
            <span className="rounded-full bg-success/12 px-3 py-1 text-xs font-semibold text-success">
              Actively raising
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Funding goal" value="$500K" />
                <Stat label="Raised" value="$312K" hint="62% complete" />
                <Stat label="Investors" value="24" hint="+6 this week" />
                <Stat label="Mentors" value="7" />
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Growth</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <FiTrendingUp /> +27% MoM
                  </span>
                </div>
                <Sparkline
                  points={[12, 18, 16, 27, 24, 38, 44, 41, 58, 66, 74, 92]}
                  className="mt-3 h-24 w-full"
                />
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                <p className="text-sm font-semibold">Applications</p>
                <div className="mt-3 space-y-2">
                  {[
                    ["Priya N.", "Frontend Intern", "New"],
                    ["Marcus L.", "Growth Lead", "Shortlisted"],
                    ["Aisha K.", "ML Engineer", "Interview"],
                  ].map(([n, r, s]) => (
                    <div
                      key={n}
                      className="flex items-center justify-between rounded-xl bg-secondary/70 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold">{n}</p>
                        <p className="text-[11px] text-muted-foreground">{r}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-primary">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
              <p className="text-sm font-semibold">Recent activity</p>
              <div className="mt-3 space-y-3">
                {[
                  ["💰", "John Anderson requested your deck", "12m ago"],
                  ["🎯", "Mentor session confirmed — Product Strategy", "1h ago"],
                  ["🚀", "Profile viewed by Sequoia Scout", "3h ago"],
                  ["👥", "3 new student applications", "Yesterday"],
                  ["📈", "Traction metrics updated", "2 days ago"],
                ].map(([e, t, time]) => (
                  <div key={t} className="flex gap-3">
                    <span className="text-base">{e}</span>
                    <div>
                      <p className="text-sm leading-snug">{t}</p>
                      <p className="text-[11px] text-muted-foreground">{time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
export function InvestorDashboardPreview() {
  return (
    <Section id="investors">
      <SectionHeading
        eyebrow="For investors"
        title="Deal flow that actually converts"
        subtitle="Portfolio health, live opportunities and analytics in one premium workspace."
      />

      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="glass gradient-border h-full rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-bold">Portfolio</p>
              <span className="text-xs text-muted-foreground">Updated live</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Invested" value="$2.4M" />
              <Stat label="Companies" value="18" />
              <Stat label="IRR" value="31%" hint="+4.2 pts" />
              <Stat label="Watchlist" value="46" />
            </div>
            <div className="mt-4 rounded-2xl border border-border/70 bg-card/70 p-4">
              <p className="text-sm font-semibold">Funding analytics</p>
              <Sparkline
                points={[20, 26, 22, 34, 46, 42, 55, 63, 60, 78, 84, 96]}
                className="mt-3 h-28 w-full"
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["EcoVolt", "Clean Energy", "+27%"],
                ["Nimbus AI", "Dev Tools", "+19%"],
                ["Curelink", "HealthTech", "+34%"],
                ["Payloop", "Fintech", "+12%"],
              ].map(([n, s, g]) => (
                <motion.div
                  key={n}
                  whileHover={{ y: -4 }}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{n}</p>
                    <p className="text-[11px] text-muted-foreground">{s}</p>
                  </div>
                  <span className="text-xs font-semibold text-success">{g}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass gradient-border h-full rounded-[2rem] p-5 sm:p-6">
            <p className="font-display text-base font-bold">Investment opportunities</p>
            <div className="mt-4 space-y-3">
              {[
                ["AI HealthCare", "Seed · $500K", "Warm intro"],
                ["Orbitly", "Pre-seed · $150K", "New"],
                ["Verdant", "Series A · $3M", "Hot"],
              ].map(([n, r, tag]) => (
                <div key={n} className="rounded-2xl border border-border/70 bg-card/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{n}</p>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {tag}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{r}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 font-display text-base font-bold">Recommended for you</p>
            <div className="mt-3 space-y-2">
              {["Nimbus AI", "Payloop", "Stackforge"].map((n) => (
                <div
                  key={n}
                  className="flex items-center justify-between rounded-xl bg-secondary/70 px-3 py-2"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <FiUsers className="size-3.5 text-muted-foreground" /> {n}
                  </span>
                  <FiArrowUpRight className="size-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
