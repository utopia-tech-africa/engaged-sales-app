"use client";

import { LightTheme, BaseProvider } from "baseui";
import { Client as StyletronClient, Server as StyletronServer } from "styletron-engine-atomic";
import { Provider as StyletronProvider } from "styletron-react";
import { type PropsWithChildren, type ReactElement, useState } from "react";

/** Must sit above app chrome (e.g. `main` z-index) so Select/Popover layers are not hidden. */
const BASE_UI_LAYER_Z_INDEX = 2000;

export const BaseUiProvider = ({ children }: PropsWithChildren): ReactElement => {
  const [engine] = useState(() =>
    typeof window === "undefined" ? new StyletronServer() : new StyletronClient()
  );

  return (
    <StyletronProvider value={engine}>
      <BaseProvider theme={LightTheme} zIndex={BASE_UI_LAYER_Z_INDEX}>
        {children}
      </BaseProvider>
    </StyletronProvider>
  );
};
