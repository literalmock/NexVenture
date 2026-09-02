import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
export function Aurora({ className, intensity = 1 }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden="true"
    >
      <motion.div
        className="absolute -top-40 -left-32 size-[38rem] rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--brand) 55%, transparent), transparent 70%)",
          opacity: 0.55 * intensity,
        }}
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 10, 0], scale: [1, 1.12, 0.96, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -top-24 right-[-10rem] size-[34rem] rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--violet) 55%, transparent), transparent 70%)",
          opacity: 0.5 * intensity,
        }}
        animate={{ x: [0, -70, 20, 0], y: [0, 50, -20, 0], scale: [1, 0.94, 1.1, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-14rem] left-1/3 size-[36rem] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--cyan) 50%, transparent), transparent 70%)",
          opacity: 0.45 * intensity,
        }}
        animate={{ x: [0, 40, -50, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
