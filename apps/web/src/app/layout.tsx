import type { Metadata, Viewport } from "next";
import { Geist_Mono, JetBrains_Mono } from "next/font/google";

import "@/bones/registry";
import { AppToaster } from "@/components/app-toaster";
import { BaseUiProvider } from "@/components/base-ui-provider";
import { BoneyardAppSetup } from "@/components/boneyard/boneyard-app-setup";
import { PwaProvider } from "@/components/pwa-provider";
import { QueryProvider } from "@/components/query-provider";

import { APP_DESCRIPTION, APP_NAME, FAVICON_16_SRC, FAVICON_32_SRC } from "@/lib/brand";

import "./globals.css";

const fontSans = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-sans"
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    icon: [
      { url: FAVICON_32_SRC, sizes: "32x32", type: "image/png" },
      { url: FAVICON_16_SRC, sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: FAVICON_32_SRC
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION
  }
};

export const viewport: Viewport = {
  themeColor: "#d87943",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground font-sans">
        <PwaProvider>
          <BoneyardAppSetup>
            <BaseUiProvider>
              <QueryProvider>
                {children}
                <AppToaster />
              </QueryProvider>
            </BaseUiProvider>
          </BoneyardAppSetup>
        </PwaProvider>
      </body>
    </html>
  );
}
