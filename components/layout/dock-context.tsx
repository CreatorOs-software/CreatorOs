"use client";

import React, { createContext, useContext, useState } from "react";

interface DockContextType {
  dockVisible: boolean;
  toggleDock: () => void;
}

const DockContext = createContext<DockContextType | undefined>(undefined);

export function DockProvider({ children }: { children: React.ReactNode }) {
  const [dockVisible, setDockVisible] = useState(true);

  return (
    <DockContext.Provider value={{ dockVisible, toggleDock: () => setDockVisible((v) => !v) }}>
      {children}
    </DockContext.Provider>
  );
}

export function useDock() {
  const ctx = useContext(DockContext);
  if (!ctx) throw new Error("useDock must be used within DockProvider");
  return ctx;
}
