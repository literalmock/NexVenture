import { motion } from "framer-motion";
const partners = [
  "Google for Startups",
  "Microsoft for Startups",
  "AWS Activate",
  "GitHub",
  "OpenAI",
  "Startup India",
  "Y Combinator",
];
export function Trust() {
  return (
    <div className="relative overflow-hidden border-y border-[#0a0d0c] bg-[#dfff62] py-5 text-[#0a0d0c]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 sm:px-8 lg:flex-row lg:items-center">
        <p className="shrink-0 font-mono text-[9px] font-black tracking-[0.16em] uppercase">
          Built on the tools founders trust
        </p>
        <span className="hidden h-6 w-px bg-[#0a0d0c]/25 lg:block" />
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 lg:justify-between lg:flex-1">
          {partners.map((p, i) => (
            <motion.span
              key={p}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              whileHover={{ y: -2 }}
              className="text-xs font-bold tracking-[-0.02em] sm:text-sm"
            >
              {p}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}
