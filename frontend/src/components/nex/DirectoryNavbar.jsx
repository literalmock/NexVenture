import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowUpRight, FiMenu, FiX } from "react-icons/fi";
import { Logo } from "./Logo";

export function DirectoryNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/8 bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-[1400px] items-center px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="rounded-lg" />
          <span className="font-display text-sm font-bold tracking-[-0.04em]">NEXVENTURE</span>
        </Link>

        <nav className="mx-auto hidden items-center gap-8 lg:flex">
          <Link to="/startups" className="text-sm font-semibold text-foreground">
            Discover
          </Link>
          <a
            href="#signals"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Investor signals
          </a>
          <a
            href="#companies"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Companies
          </a>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Community
          </Link>
        </nav>

        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <Link to="/login" className="px-3 py-2 text-sm font-semibold">
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
          >
            Join network <FiArrowUpRight />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="ml-auto flex size-10 items-center justify-center sm:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <FiX className="size-5" /> : <FiMenu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-foreground/8 bg-background sm:hidden"
          >
            <div className="grid gap-1 p-5">
              <Link
                to="/startups"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold hover:bg-secondary"
              >
                Discover companies
              </Link>
              <a
                href="#signals"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                Investor signals
              </a>
              <a
                href="#companies"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                Companies
              </a>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  className="flex h-11 items-center justify-center rounded-full border border-foreground/15 text-sm font-semibold"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="flex h-11 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background"
                >
                  Join network
                </Link>
              </div>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
