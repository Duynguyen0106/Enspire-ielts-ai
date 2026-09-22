import { cn } from "@/lib/utils";

type BandBadgeProps = {
  band: number;
  className?: string;
  size?: "sm" | "lg";
};

export function BandBadge({ band, className, size = "sm" }: BandBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-[var(--brand-soft)] font-semibold text-[var(--brand-deep)]",
        size === "lg" ? "px-4 py-2 text-3xl" : "px-2.5 py-1 text-sm",
        className
      )}
    >
      {band.toFixed(1)}
    </span>
  );
}
