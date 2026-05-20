"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type PropsWithChildren, type ReactElement, useCallback, useEffect, useState } from "react";

import { CalmBackground } from "@/components/calm-background";
import { PlatformLogo } from "@/components/platform-logo";
import type { AuthUser } from "@/lib/auth/auth-types";
import { calmMutedLinkClass, calmSecondaryButtonClass } from "@/lib/calm-ui";

const OPS_NAV_SECTIONS_STORAGE_KEY = "engaged-sales:ops-nav-sections-open";

type NavItem = { href: string; label: string };

type NavGroup = {
  /** Stable id for collapsible sections (omit with `title` for non-collapsible blocks). */
  sectionId?: string;
  /** Section label; omit for a single unlabeled block (e.g. home link). */
  title?: string;
  items: NavItem[];
};

const navGroupsForRole = (role: AuthUser["role"]): NavGroup[] => {
  const canSupervise = role === "admin" || role === "supervisor";

  const structureItems: NavItem[] = [
    { href: "/ops/users", label: "Users" },
    { href: "/ops/regions", label: "Regions" }
    // Temporarily hidden — re-enable when subwholesale management launches.
    // { href: "/ops/subwholesales", label: "Subwholesales" }
  ];
  if (canSupervise) {
    structureItems.push({ href: "/ops/activations", label: "Activations" });
  }

  const fieldItems: NavItem[] = [
    { href: "/ops/geofences", label: "Work areas" },
    { href: "/ops/outlets", label: "Outlets" }
  ];
  if (canSupervise) {
    fieldItems.push(
      { href: "/ops/attendance", label: "Attendance" },
      { href: "/ops/tracking", label: "Live tracking" }
    );
  }

  return [
    { items: [{ href: "/ops", label: "Overview" }] },
    {
      sectionId: "reporting",
      title: "Reporting & performance",
      items: [
        { href: "/ops/reporting", label: "Reporting" },
        { href: "/ops/stock", label: "Stock" },
        { href: "/ops/targets", label: "Targets" }
      ]
    },
    { sectionId: "structure", title: "Structure & people", items: structureItems },
    { sectionId: "field", title: "Field operations", items: fieldItems },
    {
      sectionId: "account",
      title: "Account",
      items: [
        { href: "/ops/organization", label: "Organization" },
        { href: "/ops/account", label: "Account" }
      ]
    }
  ];
};

const defaultOpenSections = (): Record<string, boolean> => ({
  reporting: true,
  structure: true,
  field: true,
  account: true
});

type OpsNavLinksProps = {
  role: AuthUser["role"];
  onNavigate?: () => void;
};

const OpsNavLinks = ({ role, onNavigate }: OpsNavLinksProps): ReactElement => {
  const pathname = usePathname();
  const groups = navGroupsForRole(role);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(defaultOpenSections);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPS_NAV_SECTIONS_STORAGE_KEY);
      if (raw === null || raw.length === 0) {
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const next: Record<string, boolean> = { ...defaultOpenSections() };
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "boolean") {
          next[key] = value;
        }
      }
      queueMicrotask(() => {
        setOpenSections(next);
      });
    } catch {
      // ignore invalid storage
    }
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem(OPS_NAV_SECTIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota / private mode
      }
      return next;
    });
  }, []);

  const navLinkClass = (href: string): string => {
    const active = pathname === href || (href !== "/ops" && pathname.startsWith(href));
    return [
      "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    ].join(" ");
  };

  const sectionToggleClass =
    "flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground";

  return (
    <nav className="flex flex-col gap-3" aria-label="Operations">
      {groups.map((group) => {
        const sectionId = group.sectionId;
        const isCollapsible = sectionId !== undefined && group.title !== undefined;
        const open = isCollapsible ? (openSections[sectionId] ?? true) : true;
        const panelId = isCollapsible ? `ops-nav-section-${sectionId}` : undefined;

        return (
          <div key={sectionId ?? group.title ?? "home"} className="flex flex-col gap-0.5">
            {isCollapsible ? (
              <button
                type="button"
                className={sectionToggleClass}
                aria-expanded={open}
                {...(panelId !== undefined ? { "aria-controls": panelId } : {})}
                onClick={() => {
                  toggleSection(sectionId);
                }}
              >
                <ChevronDown
                  className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 leading-tight">{group.title}</span>
              </button>
            ) : null}
            {!isCollapsible && group.title !== undefined ? (
              <p className="mb-0.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
            ) : null}
            <div
              id={isCollapsible ? panelId : undefined}
              className={["flex flex-col gap-0.5", isCollapsible && !open ? "hidden" : ""]
                .filter(Boolean)
                .join(" ")}
              {...(isCollapsible && group.title !== undefined
                ? { role: "region", "aria-label": group.title }
                : {})}
            >
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClass(item.href)}
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
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
          <div className="flex h-14 items-center border-b border-border px-3">
            <PlatformLogo href="/ops" size="sm" badge="Ops" className="min-w-0" />
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
          <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-3">
            <PlatformLogo href="/ops" size="sm" badge="Ops" className="min-w-0 flex-1" />
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
            <PlatformLogo href="/ops" size="sm" badge="Ops" className="min-w-0 flex-1" />
          </header>
          <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
