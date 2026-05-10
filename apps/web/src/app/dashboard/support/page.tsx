import { type ReactElement } from "react";

export default function FieldSupportPage(): ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get help with the field app, your account, or activations.
        </p>
      </div>
      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-sm font-semibold text-foreground">Contact</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Reach your supervisor or operations team using the channel your organization shared during
          onboarding. If you need technical help with sign-in or this app, contact your org admin.
        </p>
      </section>
    </div>
  );
}
