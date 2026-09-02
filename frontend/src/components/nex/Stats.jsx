import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
const stats = [
  { value: 1500, suffix: "+", label: "Startups" },
  { value: 850, suffix: "+", label: "Investors" },
  { value: 600, suffix: "+", label: "Mentors" },
  { value: 30, suffix: "K+", label: "Students" },
  { value: 8, prefix: "$", suffix: "M+", label: "Funding Raised" },
];
function Counter({ value, prefix = "", suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const duration = 1600;
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return (
    <span ref={ref} className="font-display text-4xl font-bold tracking-[-0.06em] sm:text-6xl">
      {prefix}
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}
export function Stats() {
  return (
    <section id="stats" className="bg-[#0a0d0c] px-5 py-20 text-[#f4f1e9] sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-12 grid gap-6 border-b border-white/15 pb-8 lg:grid-cols-2 lg:items-end">
          <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#dfff62] uppercase">
            04 / Network density
          </p>
          <p className="max-w-xl text-2xl leading-tight text-white/65 lg:justify-self-end">
            Every new profile makes the next introduction more valuable.
          </p>
        </div>
        <div className="grid grid-cols-2 border-l border-t border-white/15 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="min-h-44 border-b border-r border-white/15 p-5 sm:p-7"
            >
              <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} />
              <p className="mt-8 font-mono text-[9px] font-semibold tracking-[0.14em] text-white/38 uppercase">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
