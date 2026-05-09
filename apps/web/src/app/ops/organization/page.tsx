import type { ReactElement } from "react";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

export default function OpsOrganizationPage(): ReactElement {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Organization</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Configure regions, users, and assignments. These surfaces will connect to admin APIs as
          they ship (see BACKEND_PRD §7.9).
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="font-semibold text-foreground">Regions & subwholesales</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            CRUD for territories and wholesale nodes. Planned:{" "}
            <code className="text-xs">/admin/regions</code>,{" "}
            <code className="text-xs">/admin/subwholesales</code>.
          </p>
          <span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            Coming soon
          </span>
        </div>
        <div className={cardClass}>
          <h2 className="font-semibold text-foreground">Users & roles</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Invite promoters, assign supervisors, reset sessions. Planned:{" "}
            <code className="text-xs">/admin/users</code>.
          </p>
          <span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            Coming soon
          </span>
        </div>
        <div className={`${cardClass} md:col-span-2`}>
          <h2 className="font-semibold text-foreground">Activations</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Create campaigns, product lists, and promoter rosters. Planned:{" "}
            <code className="text-xs">/admin/activations</code> and related routes.
          </p>
          <span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            Coming soon
          </span>
        </div>
      </div>
    </div>
  );
}
