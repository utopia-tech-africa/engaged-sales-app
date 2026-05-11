"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type PropsWithChildren, type ReactElement, useState } from "react";

import { CalmBackground } from "@/components/calm-background";
import type { AuthUser } from "@/lib/auth/auth-types";
import { calmMutedLinkClass, calmSecondaryButtonClass } from "@/lib/calm-ui";

type NavItem = { href: string; label: string };

const navItemsForRole = (role: AuthUser["role"]): NavItem[] => {
  const items: NavItem[] = [
    { href: "/ops", label: "Overview" },
    { href: "/ops/stock", label: "Stock" },
    { href: "/ops/targets", label: "Targets" },
    { href: "/ops/users", label: "Users" },
    { href: "/ops/regions", label: "Regions" },
    { href: "/ops/geofences", label: "Work areas" },
    { href: "/ops/outlets", label: "Outlets" }
  ];
  if (role === "admin" || role === "supervisor") {
    items.push({ href: "/ops/activations", label: "Activations" });
    items.push({ href: "/ops/attendance", label: "Attendance" });
    items.push({ href: "/ops/tracking", label: "Live tracking" });
  }
  items.push(
    { href: "/ops/organization", label: "Organization" },
    { href: "/ops/account", label: "Account" }
  );
  return items;
};

type OpsNavLinksProps = {
  role: AuthUser["role"];
  onNavigate?: () => void;
};

const OpsNavLinks = ({ role, onNavigate }: OpsNavLinksProps): ReactElement => {
  const pathname = usePathname();
  const navLinkClass = (href: string): string => {
    const active = pathname === href || (href !== "/ops" && pathname.startsWith(href));
    return [
      "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    ].join(" ");
  };

  return (
    <nav className="flex flex-col gap-1" aria-label="Operations">
      {navItemsForRole(role).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={navLinkClass(item.href)}
          onClick={onNavigate}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
};

type OpsShellProps = PropsWithChildren<{
  user: AuthUser;
  onSignOut: () => void;
  isSigningOut: boolean;
}>;

export const OpsShell = ({
  children,
  user,
  onSignOut,
  isSigningOut
}: OpsShellProps): ReactElement => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      <CalmBackground />
      <div className="relative z-10 flex h-dvh min-h-0 flex-row overflow-hidden">
        <aside className="hidden h-dvh w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-card/90 backdrop-blur-sm lg:flex dark:bg-card/70">
          <div className="flex h-14 items-center border-b border-border px-4">
            <Link href="/ops" className="text-sm font-semibold text-foreground">
              Engaged Sales
            </Link>
            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Ops
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-2">
              <OpsNavLinks role={user.role} />
            </div>
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

        {mobileNavOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            aria-label="Close menu"
            onClick={() => {
              setMobileNavOpen(false);
            }}
          />
        ) : null}

        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col border-r border-border bg-card shadow-lg transition-transform lg:hidden dark:bg-card",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          ].join(" ")}
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold">Menu</span>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              onClick={() => {
                setMobileNavOpen(false);
              }}
            >
              Close
            </button>
          </div>
          <div className="flex flex-1 flex-col p-3">
            <OpsNavLinks
              role={user.role}
              onNavigate={() => {
                setMobileNavOpen(false);
              }}
            />
            <div className="mt-auto border-t border-border pt-4">
              <button
                type="button"
                className={calmSecondaryButtonClass}
                disabled={isSigningOut}
                onClick={() => {
                  setMobileNavOpen(false);
                  onSignOut();
                }}
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-sm lg:hidden">
            <button
              type="button"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
              aria-expanded={mobileNavOpen}
              onClick={() => {
                setMobileNavOpen((open) => !open);
              }}
            >
              Menu
            </button>
            <span className="truncate text-sm font-semibold text-foreground">Operations</span>
          </header>
          <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
