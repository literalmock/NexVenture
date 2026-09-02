import { motion } from "framer-motion";
import { FiArrowUpRight, FiCompass, FiDollarSign, FiUsers, FiZap } from "react-icons/fi";
import { HiOutlineLightBulb, HiOutlineSparkles } from "react-icons/hi2";

const features = [
  {
    icon: FiCompass,
    title: "Discover signal",
    body: "Search ventures by traction, stage, geography, hiring velocity, and warm network activity.",
    tag: "1,240+ companies",
  },
  {
    icon: FiDollarSign,
    title: "Raise with context",
    body: "Reach investors with the thesis, cheque size, and portfolio fit to understand your company.",
    tag: "$2.8B tracked",
  },
  {
    icon: HiOutlineLightBulb,
    title: "Borrow experience",
    body: "Work with operators who have already navigated the decisions directly in front of you.",
    tag: "600+ mentors",
  },
  {
    icon: FiUsers,
    title: "Assemble the team",
    body: "Meet high-agency students and early professionals ready to join before the job description exists.",
    tag: "8,400 candidates",
  },
  {
    icon: FiZap,
    title: "Enter the room",
    body: "Apply to intimate demo days, investor office hours, and operator-led working sessions.",
    tag: "42 events / month",
  },
  {
    icon: HiOutlineSparkles,
    title: "Match intelligently",
    body: "Recommendations improve as your company, thesis, skills, and network activity become richer.",
    tag: "38 matches today",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#f3f0e7] px-5 py-24 text-[#0a0d0c] sm:px-8 sm:py-32"
    >
      <div className="pointer-events-none absolute -left-32 top-12 size-80 rounded-full border border-[#0a0d0c]/8" />
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-10 border-b border-[#0a0d0c]/20 pb-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase">
              02 / One connected surface
            </p>
            <div className="mt-6 h-2 w-24 bg-[#ff7a59]" />
          </div>
          <h2 className="text-[clamp(3.4rem,7.2vw,7.4rem)] leading-[0.86] font-semibold tracking-[-0.075em]">
            Less searching.
            <span className="block font-serif font-normal italic">More momentum.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2">
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (index % 2) * 0.06 }}
              className="group grid min-h-64 grid-cols-[auto_1fr] gap-5 border-b border-[#0a0d0c]/16 py-9 lg:px-8 lg:odd:border-r lg:odd:pl-0 lg:even:pr-0"
            >
              <span className="font-mono text-[10px] text-[#0a0d0c]/38">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <feature.icon className="size-7 stroke-[1.5]" />
                  <FiArrowUpRight className="size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">
                  {feature.title}
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-6 text-[#0a0d0c]/58 sm:text-base">
                  {feature.body}
                </p>
                <p className="mt-auto pt-6 font-mono text-[9px] font-bold tracking-[0.14em] text-[#0a0d0c]/45 uppercase">
                  {feature.tag}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
