import { motion } from "framer-motion";
import { FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { NexLinkButton } from "./primitives";

export function CTA() {
  return (
    <section id="cta" className="bg-[#f3f0e7] px-5 pb-5 sm:px-8 sm:pb-8">
      <div className="relative mx-auto min-h-[560px] max-w-[1400px] overflow-hidden rounded-[2rem] bg-[#dfff62] p-7 text-[#0a0d0c] sm:p-12 lg:p-16">
        <div className="landing-noise pointer-events-none absolute inset-0 opacity-15" />
        <div className="pointer-events-none absolute -bottom-56 -right-32 size-[620px] rounded-full border-[80px] border-[#0a0d0c]/7" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative flex min-h-[430px] flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-[#0a0d0c]/25 pb-5">
            <span className="font-mono text-[10px] font-black tracking-[0.18em] uppercase">
              Your next move
            </span>
            <FiArrowUpRight className="size-6" />
          </div>

          <div>
            <h2 className="max-w-5xl text-[clamp(3.8rem,9vw,9rem)] leading-[0.78] font-semibold tracking-[-0.085em]">
              Stop searching.
              <span className="block font-serif font-normal italic">Enter the room.</span>
            </h2>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <NexLinkButton
                to="/signup"
                size="lg"
                className="!bg-[#0a0d0c] !bg-none !text-white !shadow-none"
              >
                Create your profile <FiArrowRight />
              </NexLinkButton>
              <p className="max-w-xs text-xs leading-5 text-[#0a0d0c]/58">
                Founder, investor, mentor, or student. One account grows with every role you play.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
