import { motion } from "framer-motion";
import { FiDollarSign } from "react-icons/fi";
import { HiOutlineRocketLaunch, HiOutlineLightBulb, HiOutlineAcademicCap } from "react-icons/hi2";
import { cn } from "@/lib/utils";
import { USER_ROLE_LABELS, USER_ROLES } from "@/utils/enums";

const roles = [
  {
    id: USER_ROLES.FOUNDER,
    label: USER_ROLE_LABELS[USER_ROLES.FOUNDER],
    icon: HiOutlineRocketLaunch,
  },
  { id: USER_ROLES.INVESTOR, label: USER_ROLE_LABELS[USER_ROLES.INVESTOR], icon: FiDollarSign },
  { id: USER_ROLES.MENTOR, label: USER_ROLE_LABELS[USER_ROLES.MENTOR], icon: HiOutlineLightBulb },
  {
    id: USER_ROLES.STUDENT,
    label: USER_ROLE_LABELS[USER_ROLES.STUDENT],
    icon: HiOutlineAcademicCap,
  },
];
export function RoleCards({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {roles.map((r) => {
        const active = value === r.id;
        return (
          <motion.button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -3 }}
            aria-pressed={active}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-3.5 text-left transition-colors",
              active ? "border-primary bg-primary/8" : "border-border bg-card hover:bg-secondary",
            )}
          >
            {active ? (
              <motion.span
                layoutId="role-glow"
                className="pointer-events-none absolute -top-10 -right-6 size-24 rounded-full opacity-40 blur-2xl"
                style={{ background: "var(--gradient-brand)" }}
              />
            ) : null}
            <span
              className={cn(
                "relative flex size-9 items-center justify-center rounded-xl transition-colors",
                active ? "[background-image:var(--gradient-brand)]" : "bg-secondary",
              )}
            >
              <r.icon
                className={cn(
                  "size-4",
                  active ? "text-primary-foreground" : "text-muted-foreground",
                )}
              />
            </span>
            <p className="relative mt-2.5 text-sm font-semibold">{r.label}</p>
          </motion.button>
        );
      })}
    </div>
  );
}
