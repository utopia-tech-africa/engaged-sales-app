"use client";

import { Boxes, History, Home, MapPin, Store, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type PropsWithChildren, type ReactElement } from "react";

import { CalmBackground } from "@/components/calm-background";
import { useFieldOutboxCount } from "@/hooks/use-field-outbox-count";
import { useNetworkOnline } from "@/hooks/use-network-online";
import type { AuthUser } from "@/lib/auth/auth-types";
import { calmSecondaryButtonClass } from "@/lib/calm-ui";
import { cn } from "@/lib/utils";

export type FieldNavItem = {
  href: string;
  label: string;
  segment: "home" | "activations" | "check-in" | "outlets" | "stock" | "history";
  Icon: LucideIcon;
};

/** Full field execution nav (promoters). */
export const fieldNavItemsFull: readonly FieldNavItem[] = [
  { href: "/dashboard", label: "Home", segment: "home", Icon: Home },
  {
    href: "/dashboard/activations",
    label: "Activations",
    segment: "activations",
    Icon: Store
  },
  { href: "/dashboard/check-in", label: "Check-in", segment: "check-in", Icon: MapPin },
  { href: "/dashboard/outlet-visits", label: "Outlets", segment: "outlets", Icon: Store },
  { href: "/dashboard/stock", label: "Stock", segment: "stock", Icon: Boxes },
  { href: "/dashboard/history", label: "History", segment: "history", Icon: History }
] as const;

/** Read-only client portal: home + assigned activations. */
export const fieldNavItemsClient: readonly FieldNavItem[] = [
  { href: "/dashboard", label: "Home", segment: "home", Icon: Home },
  {
    href: "/dashboard/activations",
    label: "Activations",
    segment: "activations",
    Icon: Store
  }
] as const;

export const getFieldNavItemsForUser = (user: AuthUser): readonly FieldNavItem[] =>
  user.role === "client" ? fieldNavItemsClient : fieldNavItemsFull;

/** @deprecated Prefer `fieldNavItemsFull` or `getFieldNavItemsForUser`. */
export const fieldNavItems = fieldNavItemsFull;

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
  /** When true, hide field nav until the user completes the daily clock-in gate. */
  attendanceGateLocked?: boolean;
}>;

export const FieldShell = ({
  children,
  user,
  onSignOut,
  isSigningOut,
  attendanceGateLocked = false
}: FieldShellProps): ReactElement => {
  const pathname = usePathname();
  const online = useNetworkOnline();
  const outboxPendingCount = useFieldOutboxCount();
  const showConnectivityStrip = !online || outboxPendingCount > 0;
  const navItems = getFieldNavItemsForUser(user);
  const appLabel = user.role === "client" ? "Client" : "Field";
  const mobileGridClass =
    navItems.length <= 2 ? "grid-cols-2 max-w-sm mx-auto" : "grid-cols-6 max-w-lg mx-auto";

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
        {!attendanceGateLocked ? (
          <aside className="hidden h-dvh w-56 shrink-0 flex-col overflow-hidden border-r border-border bg-card/90 backdrop-blur-sm lg:flex dark:bg-card/70">
            <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
              <Link href="/dashboard" className="text-sm font-semibold text-foreground">
                Engaged Sales
              </Link>
              <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {appLabel}
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <nav
                className="min-h-0 flex-1 overflow-y-auto p-3 pb-2"
                aria-label="Field app primary navigation"
              >
                <ul className="flex flex-col gap-1">
                  {navItems.map(({ href, label, Icon }) => (
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
              </div>
            </div>
          </aside>
        ) : (
          <aside className="hidden h-dvh w-52 shrink-0 flex-col border-r border-border bg-card/90 px-4 py-4 backdrop-blur-sm lg:flex dark:bg-card/70">
            <p className="text-sm font-semibold text-foreground">Engaged Sales</p>
            <p className="mt-3 text-xs leading-snug text-muted-foreground">
              Clock in to unlock the rest of the app for today. You can sign out if you need to
              leave.
            </p>
            <div className="mt-auto border-t border-border pt-4">
              <p className="truncate text-xs text-muted-foreground" title={user.fullName}>
                {user.fullName}
              </p>
              <button
                type="button"
                className={`${calmSecondaryButtonClass} mt-3 w-full`}
                disabled={isSigningOut}
                onClick={onSignOut}
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:hidden">
            <div className="min-w-0">
              {attendanceGateLocked ? (
                <p className="truncate text-sm font-semibold text-foreground">Clock in required</p>
              ) : (
                <Link href="/dashboard" className="truncate text-sm font-semibold text-foreground">
                  {appLabel}
                </Link>
              )}
              <p className="truncate text-xs text-muted-foreground">{user.fullName}</p>
            </div>
            <button
              type="button"
              className={cn(
                calmSecondaryButtonClass,
                "max-w-36 shrink-0 px-3 py-2 text-xs sm:text-sm"
              )}
              disabled={isSigningOut}
              onClick={onSignOut}
            >
              {isSigningOut ? "…" : "Sign out"}
            </button>
          </header>

          {showConnectivityStrip ? (
            <div
              role="status"
              className="shrink-0 border-b border-border bg-muted/50 px-4 py-2 text-center text-xs leading-snug text-muted-foreground sm:text-sm"
            >
              {!online ? (
                <>
                  You appear to be offline. This screen may be out of date, and new visits or
                  clock-ins are saved on this device first, then sent when you are back online.
                </>
              ) : (
                <>
                  {outboxPendingCount === 1
                    ? "You have 1 field record waiting to sync. It will send automatically."
                    : `You have ${String(outboxPendingCount)} field records waiting to sync. They will send automatically.`}
                </>
              )}
            </div>
          ) : null}

          <main
            className={cn(
              "mx-auto min-h-0 w-full max-w-2xl flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6 sm:py-6 lg:max-w-4xl lg:px-8 lg:pb-8",
              attendanceGateLocked
                ? "pb-8"
                : "pb-[calc(4.5rem+env(safe-area-inset-bottom,0))] lg:pb-8"
            )}
          >
            {children}
          </main>

          {!attendanceGateLocked ? (
            <nav
              className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm lg:hidden dark:bg-card/90"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              aria-label="Field app tabs"
            >
              <ul className={cn("grid gap-0 px-0.5 py-1.5 sm:px-1", mobileGridClass)}>
                {navItems.map(({ href, label, Icon }) => {
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
          ) : null}
        </div>
      </div>
    </div>
  );
};
