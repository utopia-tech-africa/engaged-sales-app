"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import { useAuthStore } from "@/lib/auth/auth-store";
import { calmMutedLinkClass } from "@/lib/calm-ui";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

type OrgCardProps = {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
  footer?: ReactElement;
};

const OrgCard = ({ title, description, href, linkLabel, footer }: OrgCardProps): ReactElement => (
  <div className={cardClass}>
    <h2 className="font-semibold text-foreground">{title}</h2>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    {href !== undefined && linkLabel !== undefined ? (
      <p className="mt-3">
        <Link href={href} className={calmMutedLinkClass}>
          {linkLabel}
        </Link>
      </p>
    ) : null}
    {footer !== undefined ? <div className="mt-3">{footer}</div> : null}
  </div>
);

export default function OpsOrganizationPage(): ReactElement {
  const role = useAuthStore((state) => state.user?.role);
  const canManageActivations = role === "admin" || role === "supervisor";
  const canSuperviseField = role === "admin" || role === "supervisor";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Organization</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Quick links to configure territories, people, campaigns, and field operations. Use the
          sidebar for the same destinations anytime.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Structure & people
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <OrgCard
            title="Regions"
            description="Create and manage sales territories. Users can reference one region; activations can link to many."
            href="/ops/regions"
            linkLabel="Open regions →"
          />
          {/* Temporarily hidden — re-enable when subwholesale management launches.
          <OrgCard
            title="Subwholesales"
            description="Wholesale nodes under a region (slugs unique per region). Use for territory hierarchy under regions."
            href="/ops/subwholesales"
            linkLabel="Open subwholesales →"
          />
          */}
          <OrgCard
            title="Users & roles"
            description="Invite promoters and read-only clients, assign supervisors, activate or deactivate accounts, and manage sessions."
            href="/ops/users"
            linkLabel="Open users →"
          />
          <OrgCard
            title="Activations"
            description="Campaigns with product lines and promoter rosters for field execution."
            href={canManageActivations ? "/ops/activations" : undefined}
            linkLabel={canManageActivations ? "Open activations →" : undefined}
            footer={
              canManageActivations ? undefined : (
                <span className="inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  Supervisor or admin
                </span>
              )
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Field operations
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <OrgCard
            title="Work areas"
            description="Circular geofences for check-in validation and outlet distance rules."
            href="/ops/geofences"
            linkLabel="Open work areas →"
          />
          <OrgCard
            title="Outlets"
            description="Outlet master data and visit reporting for trade coverage."
            href="/ops/outlets"
            linkLabel="Open outlets →"
          />
          <OrgCard
            title="Outlet visit reports"
            description="Filter and export outlet visits across the team."
            href="/ops/outlets/visits"
            linkLabel="Open visit reports →"
          />
          {canSuperviseField ? (
            <>
              <OrgCard
                title="Attendance"
                description="Daily roll-up for field staff clock-in and clock-out compliance."
                href="/ops/attendance"
                linkLabel="Open attendance →"
              />
              <OrgCard
                title="Live tracking"
                description="Real-time map and table of latest field positions."
                href="/ops/tracking"
                linkLabel="Open live tracking →"
              />
            </>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reporting & performance
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <OrgCard
            title="Reporting dashboard"
            description="Sales by region and SKU, outlet and route coverage, attendance, productivity, and staff status."
            href="/ops/reporting"
            linkLabel="Open reporting →"
          />
          <OrgCard
            title="Report email settings"
            description="Daily and weekly automated report schedules and recipient list."
            href="/ops/reporting/settings"
            linkLabel="Configure email reports →"
          />
          <OrgCard
            title="Stock overview"
            description="Cross-user inventory and sales rollup with distributor analytics."
            href="/ops/stock"
            linkLabel="Open stock overview →"
          />
          <OrgCard
            title="Daily targets"
            description="SKU monthly case targets, team achievement, leaderboard, and underperformer alerts."
            href="/ops/targets"
            linkLabel="Open targets →"
          />
        </div>
      </section>
    </div>
  );
}
