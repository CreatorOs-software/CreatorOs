"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type PageHeaderConfig = {
  onBack?: () => void;
  title: ReactNode;
  subtitle?: string;
} | null;

const Ctx = createContext<{
  config: PageHeaderConfig;
  setConfig: (c: PageHeaderConfig) => void;
}>({ config: null, setConfig: () => {} });

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PageHeaderConfig>(null);
  return <Ctx.Provider value={{ config, setConfig }}>{children}</Ctx.Provider>;
}

export function usePageHeader() {
  return useContext(Ctx);
}
