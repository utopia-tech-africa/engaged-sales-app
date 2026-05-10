"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import { useAuthStore } from "@/lib/auth/auth-store";
import { calmMutedLinkClass } from "@/lib/calm-ui";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

export default function OpsOrganizationPage(): ReactElement {
  const isAdmin = useAuthStore((state) => state.user?.role === "admin");
  const role = useAuthStore((state) => state.user?.role);
  const canManageActivations = role === "admin" || role === "supervisor";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Organization</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {isAdmin
            ? "Configure regions, users, and assignments. Subwholesales remain on the roadmap."
            : canManageActivations
              ? "Configure regions, users, and assignments. Subwholesales remain on the roadmap."
              : "Configure regions, users, and assignments. Subwholesales and supervisor-only tools follow in future releases."}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="font-semibold text-foreground">Regions</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Create and manage sales territories. Users reference a region by id in their profile.
          </p>
          <p className="mt-3">
            <Link href="/ops/regions" className={calmMutedLinkClass}>
              Open regions →
            </Link>
          </p>
        </div>
        <div className={cardClass}>
          <h2 className="font-semibold text-foreground">Subwholesales</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Wholesale nodes under regions.
            {isAdmin ? (
              <>
                {" "}
                Planned: <code className="text-xs">/admin/subwholesales</code>.
              </>
            ) : (
              " Planned for a future release."
            )}
          </p>
          <span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            Coming soon
          </span>
        </div>
        <div className={cardClass}>
          <h2 className="font-semibold text-foreground">Users & roles</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Invite promoters, assign supervisors, reset sessions.
            {isAdmin ? (
              <>
                {" "}
                Planned: <code className="text-xs">/admin/users</code>.
              </>
            ) : (
              " Manage invites and roles from Users in the sidebar."
            )}
          </p>
          {isAdmin ? (
            <span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              Coming soon
            </span>
          ) : (
            <p className="mt-3">
              <Link href="/ops/users" className={calmMutedLinkClass}>
                Open users →
              </Link>
            </p>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="font-semibold text-foreground">Activations</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Create campaigns, product lists, and promoter rosters.
            {isAdmin ? (
              <>
                {" "}
                Admin API: <code className="text-xs">/admin/activations</code>.
              </>
            ) : null}
          </p>
          {canManageActivations ? (
            <p className="mt-3">
              <Link href="/ops/activations" className={calmMutedLinkClass}>
                Open activations →
              </Link>
            </p>
          ) : (
            <span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              Supervisor or admin
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
