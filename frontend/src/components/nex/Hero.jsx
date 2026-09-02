import { motion } from "framer-motion";
import { FiArrowUpRight, FiCheck, FiTrendingUp, FiUsers } from "react-icons/fi";
import { NexLinkButton } from "./primitives";

const activity = [
  { time: "09:42", text: "Northstar opened its seed round", signal: "$1.8M" },
  { time: "09:38", text: "Lumen Capital requested 3 decks", signal: "MATCH" },
  { time: "09:31", text: "Meera joined Aerloop's founding team", signal: "HIRED" },
];

const roles = [
  ["01", "Founders", "Build visibility"],
  ["02", "Investors", "Find conviction"],
  ["03", "Mentors", "Move teams forward"],
  ["04", "Students", "Join at day zero"],
];

export function Hero() {
  return (
    <section
      id="top"
      className="landing-hero relative min-h-[940px] overflow-hidden bg-[#0a0d0c] pt-32 text-[#f4f1e9] sm:pt-40 lg:min-h-[900px]"
    >
      <div className="landing-noise pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute -right-40 top-10 size-[620px] rounded-full border border-[#dfff62]/20" />
      <div className="pointer-events-none absolute -right-20 top-32 size-[430px] rounded-full border border-white/10" />
      <div className="pointer-events-none absolute right-32 top-60 size-[180px] rounded-full bg-[#dfff62]/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="grid gap-16 lg:grid-cols-[1.08fr_.92fr] lg:items-end lg:gap-12">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-3 border-l-2 border-[#dfff62] pl-3 text-[11px] font-bold tracking-[0.2em] text-[#dfff62] uppercase"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-[#dfff62]" />
              The startup network with signal
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 max-w-4xl text-[clamp(4.4rem,10vw,9rem)] leading-[0.78] font-semibold tracking-[-0.085em]"
            >
              Where ideas
              <span className="block font-serif font-normal tracking-[-0.06em] text-[#dfff62] italic">
                gain velocity.
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.2 }}
              className="mt-10 grid max-w-3xl gap-7 border-t border-white/15 pt-6 sm:grid-cols-[1fr_auto] sm:items-end"
            >
              <p className="max-w-xl text-base leading-7 text-white/62 sm:text-lg">
                One high-signal room for founders raising capital, investors building conviction,
                mentors sharing scar tissue, and ambitious people joining early.
              </p>
              <div className="flex flex-wrap gap-3">
                <NexLinkButton
                  to="/signup"
                  size="lg"
                  className="!bg-[#dfff62] !bg-none !text-[#0a0d0c] !shadow-none hover:!bg-white"
                >
                  Enter network <FiArrowUpRight />
                </NexLinkButton>
                <NexLinkButton
                  to="/startups"
                  variant="ghost"
                  size="lg"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  Browse deals
                </NexLinkButton>
              </div>
            </motion.div>
          </div>

          <motion.aside
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative lg:pb-2"
          >
            <div className="overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#111614]/90 shadow-[0_40px_100px_-40px_rgba(0,0,0,.9)] backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase">
                  <span className="size-2 rounded-full bg-[#dfff62] shadow-[0_0_14px_#dfff62]" />
                  Live dealroom
                </div>
                <span className="font-mono text-[10px] text-white/35">BLR / LDN / SF</span>
              </div>

              <div className="border-b border-white/10 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-white/40 uppercase">
                      Company in motion
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Aerloop</h2>
                    <p className="mt-1 text-sm text-white/50">Autonomous energy inspection</p>
                  </div>
                  <span className="rounded-full bg-[#dfff62] px-3 py-1 text-[10px] font-black tracking-wide text-[#0a0d0c]">
                    TOP 2%
                  </span>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10">
                  <Signal label="ROUND" value="SEED" />
                  <Signal label="RAISED" value="$3.2M" />
                  <Signal label="GROWTH" value="+42%" positive />
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {["AM", "LC", "SK", "+8"].map((initial, index) => (
                      <span
                        key={initial}
                        className="flex size-9 items-center justify-center rounded-full border-2 border-[#111614] text-[10px] font-bold text-[#0a0d0c]"
                        style={{
                          backgroundColor: ["#dfff62", "#ff7a59", "#8fd3ff", "#f4f1e9"][index],
                        }}
                      >
                        {initial}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-2 text-xs text-white/55">
                    <FiUsers /> 11 active signals
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-bold tracking-[0.12em] uppercase">Network pulse</p>
                  <FiTrendingUp className="text-[#dfff62]" />
                </div>
                <div className="space-y-1">
                  {activity.map((item) => (
                    <div
                      key={item.time}
                      className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-t border-white/8 py-3 text-xs"
                    >
                      <span className="font-mono text-white/32">{item.time}</span>
                      <span className="text-white/70">{item.text}</span>
                      <span className="font-mono text-[9px] font-bold text-[#dfff62]">
                        {item.signal}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-full bg-[#ff7a59] px-4 py-2 text-xs font-bold text-[#0a0d0c] shadow-xl sm:flex">
              <FiCheck /> 38 matches made today
            </div>
          </motion.aside>
        </div>

        <div className="mt-24 grid border-y border-white/12 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map(([number, title, line], index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + index * 0.07 }}
              className="grid grid-cols-[auto_1fr] gap-4 border-b border-white/12 px-4 py-5 last:border-b-0 sm:[&:nth-child(2)]:border-l lg:border-b-0 lg:border-l lg:first:border-l-0"
            >
              <span className="font-mono text-[10px] text-[#dfff62]">{number}</span>
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs text-white/40">{line}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Signal({ label, value, positive }) {
  return (
    <div className="bg-white/[0.045] p-3">
      <p className="font-mono text-[8px] tracking-[0.14em] text-white/35">{label}</p>
      <p className={`mt-1 text-xs font-bold ${positive ? "text-[#dfff62]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
