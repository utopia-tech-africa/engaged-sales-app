import type { ReactElement } from "react";

/** Soft gradient + dot texture used behind calm layouts (landing, auth, app shell). */
export const CalmBackground = (): ReactElement => {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-18%,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-112 w-[min(100%,42rem)] -translate-x-1/2 rounded-[50%] bg-primary/20 blur-3xl dark:bg-primary/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-72 w-72 rounded-full bg-secondary/15 blur-3xl dark:bg-secondary/20"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23d87943' fill-opacity='0.18'/%3E%3C/svg%3E")`,
          backgroundSize: "28px 28px"
        }}
      />
    </>
  );
};
