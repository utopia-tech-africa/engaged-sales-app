import type { Metadata } from "next";
import { Geist_Mono, JetBrains_Mono } from "next/font/google";

import { BaseUiProvider } from "@/components/base-ui-provider";
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

export const metadata: Metadata = {
  title: "Engaged Sales",
  description: "Mobile-first sales operations frontend"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground font-sans">
        <BaseUiProvider>
          <QueryProvider>{children}</QueryProvider>
        </BaseUiProvider>
      </body>
    </html>
  );
}
