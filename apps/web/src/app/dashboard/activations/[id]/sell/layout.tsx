import type { Metadata } from "next";
import { type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Record sale"
};

export default function FieldSellLayout({ children }: { children: ReactNode }): ReactNode {
  return children;
}
