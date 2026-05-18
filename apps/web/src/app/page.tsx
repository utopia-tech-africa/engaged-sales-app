import Link from "next/link";

import { CalmBackground } from "@/components/calm-background";
import { PlatformLogo } from "@/components/platform-logo";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";

const highlights = [
  "Sessions and profile in one place",
  "Built for promoters, merchandisers, and supervisors",
  "Sign in fast on mobile or desktop"
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <CalmBackground />

      <main className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-10 pt-12 sm:max-w-xl sm:px-6 sm:pb-14 sm:pt-16">
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-6">
            <PlatformLogo href="/" size="lg" priority />
          </div>

          <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            Transmed Ghana · field operations
          </p>

          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="bg-linear-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              Run your day from the field
            </span>
          </h1>

          <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Secure sessions, clear roles, and profile data that stays with you—whether you are on a
            phone between stores or at a desk.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-foreground sm:text-[0.9375rem]">
            {highlights.map((line) => (
              <li key={line} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary dark:bg-primary/25"
                  aria-hidden
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 12 12"
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.5 6l2.5 2.5L9.5 3"
                    />
                  </svg>
                </span>
                <span className="leading-snug">{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link href="/auth/sign-in" className={`${calmPrimaryButtonClass} sm:w-auto`}>
              Sign in
            </Link>
            <Link href="/auth/sign-up" className={`${calmSecondaryButtonClass} sm:w-auto`}>
              Create account
            </Link>
          </div>
        </div>

        <footer className="mt-12 border-t border-border pt-8 text-center text-xs text-muted-foreground sm:mt-16">
          Secure JWT sessions · Role-aware access · Ready when you are
        </footer>
      </main>
    </div>
  );
}
