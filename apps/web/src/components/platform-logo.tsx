import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";

import { APP_NAME, APP_SHORT_NAME, LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";

const SIZE_PRESETS = {
  sm: { image: 28, imageClass: "h-7 w-auto max-w-28", wordmark: "text-sm" },
  md: { image: 36, imageClass: "h-9 w-auto max-w-36", wordmark: "text-sm" },
  lg: { image: 52, imageClass: "h-[3.25rem] w-auto max-w-48", wordmark: "text-base" }
} as const;

export type PlatformLogoSize = keyof typeof SIZE_PRESETS;

type PlatformLogoProps = {
  className?: string;
  /** When set, the logo is a link (e.g. home or dashboard). */
  href?: string;
  /** Optional pill shown after the wordmark (e.g. Ops, Field). */
  badge?: string;
  size?: PlatformLogoSize;
  /** Use the short app name next to the mark (e.g. compact mobile header). */
  compact?: boolean;
  /** Show the wordmark next to the mark. Default true. */
  showWordmark?: boolean;
  /** Prioritize loading (hero / auth). */
  priority?: boolean;
};

export const PlatformLogo = ({
  className,
  href,
  badge,
  size = "md",
  compact = false,
  showWordmark = true,
  priority = false
}: PlatformLogoProps): ReactElement => {
  const preset = SIZE_PRESETS[size];
  const label = compact ? APP_SHORT_NAME : APP_NAME;
  const imageAlt = showWordmark ? "" : label;

  const inner = (
    <span
      className={cn("inline-flex min-w-0 max-w-full items-center gap-2", className)}
      {...(showWordmark ? {} : { "aria-label": label })}
    >
      <Image
        src={LOGO_SRC}
        alt={imageAlt}
        width={preset.image}
        height={preset.image}
        className={cn("shrink-0 object-contain", preset.imageClass)}
        priority={priority}
      />
      {showWordmark ? (
        <span
          className={cn("truncate font-semibold tracking-tight text-foreground", preset.wordmark)}
        >
          {label}
        </span>
      ) : null}
      {badge !== undefined && badge.length > 0 ? (
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {badge}
        </span>
      ) : null}
    </span>
  );

  if (href !== undefined) {
    return (
      <Link
        href={href}
        className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {inner}
      </Link>
    );
  }

  return inner;
};
