import type { Metadata, Viewport } from "next";
import { Geist_Mono, JetBrains_Mono } from "next/font/google";

import { AppToaster } from "@/components/app-toaster";
import { BaseUiProvider } from "@/components/base-ui-provider";
import { PwaProvider } from "@/components/pwa-provider";
import { QueryProvider } from "@/components/query-provider";

import "./globals.css";

const fontSans = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-sans"
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

const APP_NAME = "Engaged Sales";
const APP_DESCRIPTION = "Mobile-first sales operations for field teams and ops.";

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
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
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
          <BaseUiProvider>
            <QueryProvider>
              {children}
              <AppToaster />
            </QueryProvider>
          </BaseUiProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
