import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type LinkButtonProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> & {
    disabled?: boolean;
  };

/** Anchor styled as a Button — keeps real link semantics (no role="button" on <a>). */
export function LinkButton({
  className,
  variant = "default",
  size = "default",
  disabled,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        buttonVariants({ variant, size, className }),
        disabled && "pointer-events-none opacity-50"
      )}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      {...props}
    />
  );
}
