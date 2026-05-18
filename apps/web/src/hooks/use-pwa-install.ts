"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type BeforeInstallPromptEvent,
  isBeforeInstallPromptEvent
} from "@/lib/pwa/before-install-prompt-event";

const DISMISS_STORAGE_KEY = "pwa-install-prompt-dismissed";

const readDismissed = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(DISMISS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeDismissed = (): void => {
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, "1");
  } catch {
    void 0;
  }
};

const isStandaloneDisplay = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navigatorWithStandalone.standalone === true
  );
};

const isIosSafari = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIos && isSafari;
};

export type PwaInstallPlatform = "chromium" | "ios" | "unsupported";

export type UsePwaInstallResult = {
  isInstalled: boolean;
  isDismissed: boolean;
  canNativeInstall: boolean;
  needsManualInstall: boolean;
  /** Show an “Install app” entry in the shell. */
  showInstallEntry: boolean;
  platform: PwaInstallPlatform;
  isDevelopment: boolean;
  openInstallUi: () => void;
  triggerNativeInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  dismissInstallPrompt: () => void;
  installModalOpen: boolean;
  closeInstallModal: () => void;
};

export const usePwaInstall = (): UsePwaInstallResult => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [needsManualInstall, setNeedsManualInstall] = useState(false);

  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    setIsInstalled(isStandaloneDisplay());
    setIsDismissed(readDismissed());
    setNeedsManualInstall(isIosSafari() && !isStandaloneDisplay());

    const onBeforeInstallPrompt = (event: Event): void => {
      if (!isBeforeInstallPromptEvent(event)) {
        return;
      }
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onAppInstalled = (): void => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallModalOpen(false);
    };

    const onDisplayModeChange = (): void => {
      setIsInstalled(isStandaloneDisplay());
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window.matchMedia("(display-mode: standalone)").addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window
        .matchMedia("(display-mode: standalone)")
        .removeEventListener("change", onDisplayModeChange);
    };
  }, []);

  const canNativeInstall = deferredPrompt !== null;
  const platform: PwaInstallPlatform = canNativeInstall
    ? "chromium"
    : needsManualInstall
      ? "ios"
      : "unsupported";

  const showInstallEntry = !isInstalled && !isDismissed;

  const openInstallUi = useCallback((): void => {
    setInstallModalOpen(true);
  }, []);

  const closeInstallModal = useCallback((): void => {
    setInstallModalOpen(false);
  }, []);

  const dismissInstallPrompt = useCallback((): void => {
    writeDismissed();
    setIsDismissed(true);
    setInstallModalOpen(false);
  }, []);

  const triggerNativeInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    if (deferredPrompt === null) {
      return "unavailable";
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    return outcome;
  }, [deferredPrompt]);

  return {
    isInstalled,
    isDismissed,
    canNativeInstall,
    needsManualInstall,
    showInstallEntry,
    platform,
    isDevelopment,
    openInstallUi,
    triggerNativeInstall,
    dismissInstallPrompt,
    installModalOpen,
    closeInstallModal
  };
};
