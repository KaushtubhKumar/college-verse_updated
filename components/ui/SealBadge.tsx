import { cn } from "@/lib/utils";

interface SealBadgeProps {
  label: string;
  tone?: "gold" | "ink" | "teal";
  size?: "sm" | "md" | "lg";
  title?: string;
  className?: string;
}

const TONE_CLASSES: Record<string, string> = {
  gold: "bg-gold-500 text-ink-950 ring-gold-700/30",
  ink: "bg-ink-900 text-paper ring-ink-700/50",
  teal: "bg-teal-600 text-paper ring-teal-700/40",
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "w-8 h-8 text-[10px]",
  md: "w-11 h-11 text-[11px]",
  lg: "w-16 h-16 text-sm",
};

/**
 * The seal badge — a small circular medallion used wherever the app surfaces
 * an official mark of merit: NIRF rank, NAAC grade, or the "Best Fit" winner
 * in compare. One consistent shape ties those three moments together.
 */
export default function SealBadge({ label, tone = "gold", size = "md", title, className }: SealBadgeProps) {
  return (
    <div
      title={title}
      className={cn(
        "seal-sheen relative inline-flex items-center justify-center rounded-full font-mono-label font-semibold leading-none ring-4 shadow-sm select-none",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className
      )}
    >
      {label}
    </div>
  );
}
