"use client";

import { createContext, useContext } from "react";
import appConfig from "@/config/appConfig";

// Provides the active mode config to all child components.
// Defaults to the build-time config; overridden at runtime when
// ?mode= query param or the dev toggle changes the active mode.
export const ModeContext = createContext(appConfig);

export function useModeConfig() {
  return useContext(ModeContext);
}
