import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineMenuAlt4, HiX } from "react-icons/hi";
import { cn } from "@/lib/utils";
import { NexLinkButton } from "./primitives";
import { Logo } from "./Logo";
const nav = [
  { label: "Home", hash: "top" },
  { label: "Explore", hash: "features" },
  { label: "Startups", to: "/startups" },
  { label: "Investors", hash: "investors" },
  { label: "Mentors", hash: "voices" },
  { label: "Events", hash: "cta" },
  { label: "About", hash: "stats" },
];
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <motion.header
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1400px] items-center justify-between rounded-full border px-4 text-white transition-all duration-500 sm:px-5",
          scrolled
            ? "h-14 border-white/12 bg-[#101412]/94 shadow-[0_18px_60px_-20px_rgba(0,0,0,.65)] backdrop-blur-xl"
            : "h-16 border-white/10 bg-[#101412]/72 backdrop-blur-md",
        )}
      >
        <Link to="/" hash="top" className="flex items-center gap-2.5">
          <Logo className="!bg-[#dfff62] !bg-none" />
          <span className="font-display text-[15px] font-bold tracking-tight text-white">
            NEXVENTURE
          </span>
          <span className="hidden rounded-full border border-white/12 px-2 py-1 font-mono text-[8px] tracking-widest text-white/40 sm:inline">
            BETA
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className="relative rounded-full px-3 py-2 text-xs font-semibold text-white/55 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={`#${item.hash}`}
                className="relative rounded-full px-3 py-2 text-xs font-semibold text-white/55 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <NexLinkButton to="/login" variant="subtle" size="sm">
            Login
          </NexLinkButton>
          <NexLinkButton
            to="/signup"
            size="sm"
            className="!bg-[#dfff62] !bg-none !text-[#0a0d0c] !shadow-none"
          >
            Join network
          </NexLinkButton>
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white md:hidden"
        >
          {open ? <HiX size={18} /> : <HiOutlineMenuAlt4 size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mx-auto mt-2 max-w-[1400px] rounded-2xl border border-white/12 bg-[#101412]/96 p-4 text-white shadow-2xl backdrop-blur-xl md:hidden"
          >
            <div className="grid grid-cols-2 gap-1">
              {nav.map((item) =>
                item.to ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={`#${item.hash}`}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white"
                  >
                    {item.label}
                  </a>
                ),
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <NexLinkButton to="/login" variant="ghost" size="sm" className="flex-1">
                Login
              </NexLinkButton>
              <NexLinkButton to="/signup" size="sm" className="flex-1">
                Get Started
              </NexLinkButton>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
