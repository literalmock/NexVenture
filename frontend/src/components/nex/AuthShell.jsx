import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { FcGoogle } from "react-icons/fc";
import { Aurora } from "./Aurora";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
export function AuthShell({ title, lead, bullets, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0" style={{ background: "var(--gradient-brand)" }} />
        <Aurora intensity={0.7} />
        <div className="grid-lines absolute inset-0 opacity-20" />

        {[
          { s: 180, x: "8%", y: "12%", d: 12 },
          { s: 120, x: "70%", y: "22%", d: 16 },
          { s: 220, x: "55%", y: "62%", d: 20 },
          { s: 90, x: "18%", y: "72%", d: 14 },
        ].map((b, i) => (
          <motion.span
            key={i}
            className="absolute rounded-[38%] border border-white/25 bg-white/10 backdrop-blur-sm"
            style={{ width: b.s, height: b.s, left: b.x, top: b.y }}
            animate={{ y: [0, -22, 0], rotate: [0, 18, 0] }}
            transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" hash="top" className="flex w-fit items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Logo className="size-8" />
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight text-primary-foreground">
              NEXVENTURE
            </span>
          </Link>

          <div>
            <h2 className="max-w-md text-4xl leading-[1.05] font-semibold text-primary-foreground">
              {title}
            </h2>
            <p className="mt-4 max-w-md text-sm text-primary-foreground/80">{lead}</p>
            <ul className="mt-8 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                  <span className="size-1.5 rounded-full bg-primary-foreground/80" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-primary-foreground/70">
            1,500+ startups · 850+ investors · 600+ mentors
          </p>
        </div>
      </div>

      <div className="relative flex items-center justify-center overflow-hidden px-5 py-16">
        <Aurora intensity={0.5} />
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass gradient-border relative w-full max-w-md rounded-[2rem] p-7 sm:p-9"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
export function Field({ label, error, className, ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <input
        {...props}
        className={cn(
          "mt-2 h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/12",
          error && "border-destructive focus:border-destructive focus:ring-destructive/12",
          className,
        )}
      />
      {error ? <span className="mt-1.5 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
export function GoogleButton({ label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card text-sm font-semibold transition-all hover:-translate-y-0.5 hover:bg-secondary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <FcGoogle className="size-4.5" /> {label}
    </button>
  );
}
export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        or
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
