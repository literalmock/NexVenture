import { cn } from "@/lib/utils";
export function Logo({ className }) {
  return (
    <span
      className={cn(
        "relative flex size-8 items-center justify-center rounded-xl [background-image:var(--gradient-brand)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
        <path
          d="M5 19V5l14 14V5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
