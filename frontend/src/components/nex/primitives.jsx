import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
export function Section({ id, className, children }) {
  return (
    <section
      id={id}
      className={cn("relative mx-auto w-full max-w-6xl px-5 py-20 sm:py-28", className)}
    >
      {children}
    </section>
  );
}
export function Eyebrow({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </span>
  );
}
export function SectionHeading({ eyebrow, title, subtitle, align = "center" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "")}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-5 text-3xl leading-[1.08] font-semibold text-foreground sm:text-5xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">{subtitle}</p>
      ) : null}
    </motion.div>
  );
}
export function Reveal({ children, delay = 0, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
const base =
  "group relative inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60";
const sizes = {
  sm: "h-9 px-4",
  md: "h-11 px-6",
  lg: "h-13 px-8 text-base",
};
const variants = {
  primary:
    "text-primary-foreground shadow-[var(--shadow-lift)] hover:-translate-y-0.5 [background-image:var(--gradient-brand)]",
  ghost: "border border-border bg-card/70 text-foreground hover:-translate-y-0.5 hover:bg-card",
  ink: "bg-ink text-primary-foreground hover:-translate-y-0.5",
  subtle: "text-muted-foreground hover:text-foreground",
};
export function NexButton({ variant = "primary", size = "md", className, children, ...rest }) {
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}
export function NexLinkButton({ to, hash, variant = "primary", size = "md", className, children }) {
  return (
    <Link to={to} hash={hash} className={cn(base, sizes[size], variants[variant], className)}>
      {children}
    </Link>
  );
}
export function GlassCard({ className, children }) {
  return <div className={cn("glass gradient-border rounded-3xl", className)}>{children}</div>;
}
