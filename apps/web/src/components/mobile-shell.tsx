import type { PropsWithChildren, ReactElement } from "react";

import { CalmBackground } from "@/components/calm-background";
import { PlatformLogo } from "@/components/platform-logo";

type MobileShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  /** `auth` vertically centers the panel; `app` keeps content toward the top for longer screens. */
  variant?: "auth" | "app";
  /** Show platform logo above the card (default true for auth). */
  showBrand?: boolean;
}>;

export const MobileShell = ({
  children,
  title,
  subtitle,
  variant = "auth",
  showBrand = variant === "auth"
}: MobileShellProps): ReactElement => {
  const mainLayoutClass =
    variant === "auth"
      ? "flex flex-1 flex-col justify-center pb-8 sm:pb-10"
      : "flex flex-1 flex-col justify-start pb-10 pt-1 sm:pt-2";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <CalmBackground />
      <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8 sm:max-w-lg sm:px-6 sm:py-10">
        {showBrand ? (
          <div className="mb-6 flex justify-center sm:mb-8">
            <PlatformLogo href="/" size="md" priority />
          </div>
        ) : null}
        <div className={mainLayoutClass}>
          <div className="overflow-visible rounded-2xl border border-border bg-card/90 p-6 shadow-sm backdrop-blur-sm dark:bg-card/70">
            <header className="mb-6 border-b border-border pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            </header>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
