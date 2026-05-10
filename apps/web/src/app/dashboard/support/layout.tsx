import type { Metadata } from "next";
import { type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Support"
};

export default function FieldSupportLayout({ children }: { children: ReactNode }): ReactNode {
  return children;
}
