import { Link } from "@tanstack/react-router";
import { FiGithub, FiLinkedin, FiTwitter, FiYoutube } from "react-icons/fi";
import { Logo } from "./Logo";
import { NexButton } from "./primitives";
const columns = [
  { title: "Product", links: ["Overview", "Startups", "Investors", "Mentors", "Pricing"] },
  { title: "Resources", links: ["Guides", "Playbooks", "Fundraising 101", "Templates"] },
  {
    title: "Community",
    links: ["Founders Circle", "Investor Network", "Campus Chapters", "Events"],
  },
  { title: "Developers", links: ["API", "Docs", "Changelog", "Status"] },
  { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
];
export function Footer() {
  return (
    <footer className="relative border-t border-border/70 bg-card/40">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link to="/" hash="top" className="flex items-center gap-2.5">
              <Logo />
              <span className="font-display text-[15px] font-bold tracking-tight">NEXVENTURE</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The ecosystem where founders, investors, mentors and students build what's next.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-6 flex max-w-sm items-center gap-2"
            >
              <input
                type="email"
                required
                placeholder="you@company.com"
                aria-label="Email address"
                className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm outline-none transition-shadow focus:border-primary focus:ring-4 focus:ring-primary/12"
              />
              <NexButton size="sm" type="submit" className="h-11 px-5">
                Subscribe
              </NexButton>
            </form>
            <div className="mt-6 flex gap-2">
              {[FiTwitter, FiLinkedin, FiGithub, FiYoutube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-primary"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold tracking-[0.14em] text-foreground uppercase">
                  {col.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} NEXVENTURE. All rights reserved.</p>
          <p>Built for founders, investors, mentors and students.</p>
        </div>
      </div>
    </footer>
  );
}
