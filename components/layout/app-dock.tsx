"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CheckSquare,
  Inbox,
  LayoutDashboard,
  NotebookPen,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassEffect, GlassFilter } from "@/components/ui/liquid-glass";
import { FloatingWindow } from "@/components/ui/floating-window";
import { TodoPanel } from "@/components/ui/todo-panel";
import { NotesPanel } from "@/components/ui/notes-panel";
import { useDock, type PanelId } from "./dock-context";

type DockItem =
  | { label: string; href: string; icon: React.ElementType; panel?: never }
  | { label: string; panel: PanelId; icon: React.ElementType; href?: never };

const dockItems: DockItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inbox", panel: "inbox", icon: Inbox },
  { label: "Benachrichtigungen", panel: "benachrichtigungen", icon: Bell },
  { label: "Notizen", panel: "notizen", icon: NotebookPen },
  { label: "Todos", panel: "todos", icon: CheckSquare },
  { label: "Settings", href: "/settings", icon: Settings2 },
];

const panelConfig: Record<PanelId, { title: string; placeholder: string }> = {
  inbox: {
    title: "Inbox",
    placeholder: "Deine Nachrichten erscheinen hier.",
  },
  benachrichtigungen: {
    title: "Benachrichtigungen",
    placeholder: "Keine neuen Benachrichtigungen.",
  },
  notizen: {
    title: "Notizen",
    placeholder: "Deine Notizen erscheinen hier.",
  },
  todos: {
    title: "Todos",
    placeholder: "Deine To-dos erscheinen hier.",
  },
};

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 20,
} as const;

const PANEL_SIZES: Record<PanelId, { width: number; height: number }> = {
  notizen:          { width: 640, height: 480 },
  todos:            { width: 440, height: 520 },
  inbox:            { width: 440, height: 520 },
  benachrichtigungen: { width: 440, height: 520 },
};

function getPanelDefaults(panel: PanelId) {
  const size = PANEL_SIZES[panel];
  const position =
    typeof window === "undefined"
      ? { x: 24, y: 80 }
      : {
          x: window.innerWidth - size.width - 24,
          y: window.innerHeight - size.height - 30,
        };
  return { size, position };
}

export function AppDock() {
  const { dockVisible, activePanel, setActivePanel } = useDock();
  const pathname = usePathname();

  function handlePanelToggle(panel: PanelId) {
    setActivePanel(activePanel === panel ? null : panel);
  }

  return (
    <>
      <GlassFilter />

      {/* Floating panel – keyed by panel so position resets on switch */}
      {activePanel && (
        <FloatingWindow.Root
          key={activePanel}
          open={activePanel !== null}
          onOpenChange={(open) => {
            if (!open) setActivePanel(null);
          }}
          defaultPosition={getPanelDefaults(activePanel).position}
          defaultSize={getPanelDefaults(activePanel).size}
        >
          <FloatingWindow.Content>
            {activePanel === "todos" ? (
              <TodoPanel />
            ) : activePanel === "notizen" ? (
              <NotesPanel />
            ) : (
              <>
                <FloatingWindow.Header title={panelConfig[activePanel].title} />
                <FloatingWindow.Body>
                  <p className="text-sm text-muted-foreground">
                    {panelConfig[activePanel].placeholder}
                  </p>
                </FloatingWindow.Body>
              </>
            )}
          </FloatingWindow.Content>
        </FloatingWindow.Root>
      )}

      <AnimatePresence>
        {dockVisible && (
          <motion.div
            key="dock"
            initial={{ opacity: 0, y: 80, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{
              opacity: 0,
              x: "calc(-50% - 55vw)",
              y: 120,
              scale: 0.08,
              transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
            }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed bottom-6 left-1/2 z-50 pointer-events-auto"
            style={{ originX: 0.5, originY: 1 }}
          >
            <GlassEffect className="rounded-2xl">
              <div className="flex items-end gap-1 px-2.5 py-2">
                {dockItems.map((item) => {
                  const { label, icon: Icon } = item;
                  const isActive =
                    item.href !== undefined
                      ? pathname === item.href ||
                        pathname.startsWith(item.href + "/")
                      : item.panel === activePanel;

                  const iconNode = (
                    <motion.div
                      whileHover={{ scale: 1.2, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      transition={springTransition}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-xl transition-colors duration-200",
                        isActive ? "bg-black" : "hover:bg-white/20",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 transition-colors",
                          isActive ? "text-white" : "text-black/65",
                        )}
                      />
                    </motion.div>
                  );

                  return item.href !== undefined ? (
                    <Link key={label} href={item.href} title={label}>
                      {iconNode}
                    </Link>
                  ) : (
                    <button
                      key={label}
                      title={label}
                      onClick={() => handlePanelToggle(item.panel)}
                    >
                      {iconNode}
                    </button>
                  );
                })}
              </div>
            </GlassEffect>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
