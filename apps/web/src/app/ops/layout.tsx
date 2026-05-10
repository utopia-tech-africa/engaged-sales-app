import type { ReactElement, ReactNode } from "react";

import { OpsLayoutClient } from "./ops-layout-client";

export default function OpsLayout({ children }: { children: ReactNode }): ReactElement {
  return <OpsLayoutClient>{children}</OpsLayoutClient>;
}
