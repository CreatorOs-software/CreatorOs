"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Inbox,
  LayoutDashboard,
  NotebookPen,
  Settings2,
} from "lucide-react";
import { Button } from "@talentos/ui";
import { cn } from "@/lib/utils";
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
  { label: "Notizen", panel: "notizen", icon: NotebookPen },
  { label: "Todos", panel: "todos", icon: CheckSquare },
  { label: "Settings", href: "/settings", icon: Settings2 },
];

const panelConfig: Record<PanelId, { title: string; placeholder: string }> = {
  inbox: {
    title: "Inbox",
    placeholder: "Deine Nachrichten erscheinen hier.",
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
  notizen: { width: 640, height: 480 },
  todos: { width: 440, height: 520 },
  inbox: { width: 440, height: 520 },
};

function getPanelDefaults(panel: PanelId) {
  const size = PANEL_SIZES[panel];
  const position =
    typeof window === "undefined"
      ? { x: 24, y: 40 }
      : {
          x: window.innerWidth - size.width - 24,
          y: window.innerHeight - size.height - 30,
        };
  return { size, position };
}

export function AppDock() {
  const { dockVisible, activePanel, setActivePanel } = useDock();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  function handlePanelToggle(panel: PanelId) {
    setActivePanel(activePanel === panel ? null : panel);
  }

  return (
    <>
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
            className="absolute bottom-0 left-1/2 z-50 pointer-events-auto"
            style={{ originX: 0.5, originY: 1 }}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
          >
            <div className="flex flex-col items-center px-6 pb-1.5 pt-8">
              <AnimatePresence mode="wait" initial={false}>
                {isExpanded ? (
                  <motion.div
                    key="dock-panel"
                    initial={{ opacity: 0, y: 16, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.92 }}
                    transition={springTransition}
                  >
                    <div className="rounded-2xl bg-white shadow-[0_6px_6px_rgba(0,0,0,0.2),0_0_20px_rgba(0,0,0,0.1)]">
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
                                "relative w-10 h-10 flex items-center justify-center rounded-xl transition-colors duration-200",
                                !isActive && "hover:bg-white/20",
                              )}
                            >
                              <Icon
                                strokeWidth={isActive ? 2.5 : 2}
                                className={cn(
                                  "w-5 h-5 transition-colors",
                                  isActive ? "text-primary" : "text-black/65",
                                )}
                              />
                            </motion.div>
                          );

                          return item.href !== undefined ? (
                            <Link key={label} href={item.href} title={label}>
                              {iconNode}
                            </Link>
                          ) : (
                            <Button
                              key={label}
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={label}
                              onClick={() => handlePanelToggle(item.panel)}
                              className="size-auto rounded-none p-0 hover:bg-transparent"
                            >
                              {iconNode}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="dock-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-2 w-50 rounded-full bg-[#4894A5] shadow-[0_0_10px_rgba(74,222,128,0.65)]"
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
