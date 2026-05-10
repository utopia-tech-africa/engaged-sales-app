"use client";

import { HelpCircle, History, Home, MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type PropsWithChildren, type ReactElement } from "react";

import { CalmBackground } from "@/components/calm-background";
import type { AuthUser } from "@/lib/auth/auth-types";
import { calmMutedLinkClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import { cn } from "@/lib/utils";

/** Primary navigation for field roles (promoter / merchandizer): home, check-in, history, support. */
export const fieldNavItems = [
  { href: "/dashboard", label: "Home", segment: "home" as const, Icon: Home },
  { href: "/dashboard/check-in", label: "Check-in", segment: "check-in" as const, Icon: MapPin },
  { href: "/dashboard/history", label: "History", segment: "history" as const, Icon: History },
  { href: "/dashboard/support", label: "Support", segment: "support" as const, Icon: HelpCircle }
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type FieldShellProps = PropsWithChildren<{
  user: AuthUser;
  onSignOut: () => void;
  isSigningOut: boolean;
}>;

export const FieldShell = ({
  children,
  user,
  onSignOut,
  isSigningOut
}: FieldShellProps): ReactElement => {
  const pathname = usePathname();

  const linkClass = (href: string): string =>
    [
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      isNavActive(pathname, href)
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    ].join(" ");

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      <CalmBackground />
      <div className="relative z-10 flex h-dvh min-h-0 flex-row overflow-hidden">
        <aside className="hidden h-dvh w-56 shrink-0 flex-col overflow-hidden border-r border-border bg-card/90 backdrop-blur-sm lg:flex dark:bg-card/70">
          <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
            <Link href="/dashboard" className="text-sm font-semibold text-foreground">
              Engaged Sales
            </Link>
            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Field
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <nav
              className="min-h-0 flex-1 overflow-y-auto p-3 pb-2"
              aria-label="Field app primary navigation"
            >
              <ul className="flex flex-col gap-1">
                {fieldNavItems.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link href={href} className={linkClass(href)}>
                      <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="shrink-0 border-t border-border p-3 pt-4">
              <p className="truncate px-3 text-xs text-muted-foreground" title={user.fullName}>
                {user.fullName}
              </p>
              <p className="truncate px-3 text-xs capitalize text-foreground">{user.role}</p>
              <button
                type="button"
                className={`${calmSecondaryButtonClass} mt-3`}
                disabled={isSigningOut}
                onClick={onSignOut}
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
              <Link href="/" className={`${calmMutedLinkClass} mt-3 block`}>
                Marketing site
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:hidden">
            <div className="min-w-0">
              <Link href="/dashboard" className="truncate text-sm font-semibold text-foreground">
                Field
              </Link>
              <p className="truncate text-xs text-muted-foreground">{user.fullName}</p>
            </div>
            <button
              type="button"
              className={cn(
                calmSecondaryButtonClass,
                "max-w-[9rem] shrink-0 px-3 py-2 text-xs sm:text-sm"
              )}
              disabled={isSigningOut}
              onClick={onSignOut}
            >
              {isSigningOut ? "…" : "Sign out"}
            </button>
          </header>

          <main className="mx-auto min-h-0 w-full max-w-2xl flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-6 lg:max-w-4xl lg:px-8 lg:pb-8">
            {children}
          </main>

          <nav
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm lg:hidden dark:bg-card/90"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            aria-label="Field app tabs"
          >
            <ul className="mx-auto grid max-w-lg grid-cols-4 gap-0 px-1 py-1.5">
              {fieldNavItems.map(({ href, label, Icon }) => {
                const active = isNavActive(pathname, href);
                return (
                  <li key={href} className="min-w-0">
                    <Link
                      href={href}
                      className={cn(
                        "flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[10px] font-medium sm:text-xs",
                        active
                          ? "text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="size-5 shrink-0 sm:size-[1.35rem]" aria-hidden />
                      <span className="truncate px-0.5">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};
