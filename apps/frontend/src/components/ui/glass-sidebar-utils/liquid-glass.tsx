import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface LiquidGlassProps extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean;
  variant?: "default" | "frosted";
  shadow?: boolean;
  bezel?: number;
  tint?: string;
}

/**
 * Translucent glass surface wrapper backed by theme-aware CSS glass tokens.
 */
export const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  (
    {
      asChild = false,
      variant = "default",
      shadow = true,
      bezel,
      tint,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "div";
    const resolvedTint =
      tint ?? (variant === "frosted" ? "var(--glass-tint-frosted)" : "var(--glass-tint)");
    const blurRadius = variant === "frosted" ? "blur(18px) saturate(160%)" : "blur(10px)";

    const mergedStyle: React.CSSProperties = {
      backgroundColor: resolvedTint,
      backdropFilter: blurRadius,
      WebkitBackdropFilter: blurRadius,
      boxShadow: shadow
        ? bezel != null
          ? `var(--glass-rim), var(--glass-shadow)`
          : "var(--glass-rim), var(--glass-shadow)"
        : "var(--glass-rim)",
      ...style,
    };

    return (
      <Comp
        ref={ref}
        data-slot="liquid-glass"
        data-variant={variant}
        className={cn("relative", className)}
        style={mergedStyle}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);

LiquidGlass.displayName = "LiquidGlass";
