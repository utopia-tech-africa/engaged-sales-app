"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import { type ReactElement, useEffect, useRef } from "react";

import { PwaInstallProvider, usePwaInstallContext } from "@/components/pwa-install-context";
import { PlatformLogo } from "@/components/platform-logo";
import { APP_NAME } from "@/lib/brand";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TOAST_ID = "pwa-install-nudge";

const PwaInstallAutoNudge = (): null => {
  const {
    isInstalled,
    isDismissed,
    canNativeInstall,
    needsManualInstall,
    openInstallUi,
    triggerNativeInstall
  } = usePwaInstallContext();
  const hasNudged = useRef(false);

  useEffect(() => {
    if (hasNudged.current || isInstalled || isDismissed) {
      return;
    }
    if (!canNativeInstall && !needsManualInstall) {
      return;
    }

    hasNudged.current = true;

    toast(`${APP_NAME} can be installed`, {
      id: TOAST_ID,
      description: "Add it to your home screen for offline field work.",
      duration: 12_000,
      action: {
        label: "Install",
        onClick: () => {
          if (canNativeInstall) {
            void triggerNativeInstall().then((outcome) => {
              if (outcome === "accepted") {
                toast.success(`${APP_NAME} installed`);
              }
            });
            return;
          }
          openInstallUi();
        }
      }
    });
  }, [
    canNativeInstall,
    isDismissed,
    isInstalled,
    needsManualInstall,
    openInstallUi,
    triggerNativeInstall
  ]);

  return null;
};

type InstallDialogProps = {
  open: boolean;
  onClose: () => void;
  onDismiss: () => void;
  onInstall: () => void;
  canNativeInstall: boolean;
  needsManualInstall: boolean;
  isDevelopment: boolean;
};

function InstallDialog({
  open,
  onClose,
  onDismiss,
  onInstall,
  canNativeInstall,
  needsManualInstall,
  isDevelopment
}: InstallDialogProps): ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-4000 flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px] dark:bg-black/65"
        aria-label="Close install dialog"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl",
          "sm:max-h-[min(520px,90vh)] sm:rounded-2xl"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-5 dark:bg-muted/15">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Smartphone className="size-5 text-primary" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-foreground">Install app</p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="mb-4 flex justify-center">
            <PlatformLogo href="/" size="md" showWordmark={false} />
          </div>
          <h2 id="pwa-install-title" className="text-center text-lg font-semibold text-foreground">
            Install {APP_NAME}
          </h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
            Install on this device for faster access, full-screen mode, and better offline support
            for field work.
          </p>

          {needsManualInstall ? (
            <ol className="mt-5 space-y-3 text-sm text-foreground">
              <li className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  1
                </span>
                <span>
                  Tap <Share className="mx-0.5 inline size-4 align-text-bottom" aria-hidden /> Share
                  in Safari&apos;s toolbar.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  2
                </span>
                <span>
                  Choose <strong>Add to Home Screen</strong>, then confirm.
                </span>
              </li>
            </ol>
          ) : null}

          {isDevelopment ? (
            <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
              Development mode disables the service worker, so browsers usually will not offer
              install. Use a production build to test the real install flow.
            </p>
          ) : null}

          {!canNativeInstall && !needsManualInstall && !isDevelopment ? (
            <p className="mt-4 text-sm text-muted-foreground">
              On desktop Chrome or Edge, open the browser menu and choose{" "}
              <strong>Install app</strong> when it appears. Some browsers only show install after
              you have visited a few times.
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-border p-4 sm:px-5">
          <button type="button" className={calmPrimaryButtonClass} onClick={onInstall}>
            <Download className="mr-2 inline size-4" aria-hidden />
            {canNativeInstall ? "Install app" : needsManualInstall ? "Got it" : "Install app"}
          </button>
          <button type="button" className={calmSecondaryButtonClass} onClick={onDismiss}>
            Not now
          </button>
        </footer>
      </div>
    </div>
  );
}

const PwaInstallModalHost = (): ReactElement => {
  const {
    installModalOpen,
    closeInstallModal,
    dismissInstallPrompt,
    triggerNativeInstall,
    canNativeInstall,
    needsManualInstall,
    isDevelopment
  } = usePwaInstallContext();

  const handleInstall = (): void => {
    void (async () => {
      if (canNativeInstall) {
        const outcome = await triggerNativeInstall();
        if (outcome === "accepted") {
          closeInstallModal();
          toast.success(`${APP_NAME} installed`);
          return;
        }
        if (outcome === "dismissed") {
          toast.message("Install cancelled");
        }
        return;
      }
      if (needsManualInstall) {
        toast.message("Use Share, then Add to Home Screen", {
          description: "Safari does not support one-tap install from the website."
        });
        return;
      }
      if (isDevelopment) {
        toast.message("PWA install is disabled in development", {
          description:
            "Run a production build (`pnpm build && pnpm start`) over HTTPS to test install."
        });
        return;
      }
      toast.message("Install is not available in this browser", {
        description: "Try Chrome or Edge on desktop/Android, or Safari on iPhone."
      });
    })();
  };

  return (
    <InstallDialog
      open={installModalOpen}
      onClose={closeInstallModal}
      onDismiss={dismissInstallPrompt}
      onInstall={handleInstall}
      canNativeInstall={canNativeInstall}
      needsManualInstall={needsManualInstall}
      isDevelopment={isDevelopment}
    />
  );
};

/** Toast nudge + install modal. Mount inside `PwaInstallProvider`. */
export const PwaInstallUi = (): ReactElement => (
  <>
    <PwaInstallAutoNudge />
    <PwaInstallModalHost />
  </>
);

export const PwaInstallPrompt = (): ReactElement => (
  <PwaInstallProvider>
    <PwaInstallUi />
  </PwaInstallProvider>
);
