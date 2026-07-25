"use client";

import React, { createContext, useContext, useState } from "react";

export type PanelId = "inbox" | "benachrichtigungen" | "notizen" | "todos";

interface DockContextType {
  dockVisible: boolean;
  toggleDock: () => void;
  activePanel: PanelId | null;
  setActivePanel: (id: PanelId | null) => void;
}

const DockContext = createContext<DockContextType | undefined>(undefined);

export function DockProvider({ children }: { children: React.ReactNode }) {
  const [dockVisible, setDockVisible] = useState(true);
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);

  return (
    <DockContext.Provider
      value={{
        dockVisible,
        toggleDock: () => setDockVisible((v) => !v),
        activePanel,
        setActivePanel,
      }}
    >
      {children}
    </DockContext.Provider>
  );
}

export function useDock() {
  const ctx = useContext(DockContext);
  if (!ctx) throw new Error("useDock must be used within DockProvider");
  return ctx;
}
