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
import { useDock } from "./dock-context";

type DockItem =
  | { label: string; href: string; icon: React.ElementType; action?: never }
  | { label: string; action: () => void; icon: React.ElementType; href?: never };

const dockItems: DockItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Benachrichtigungen", action: () => {}, icon: Bell },
  { label: "Notizen", action: () => {}, icon: NotebookPen },
  { label: "Todos", action: () => {}, icon: CheckSquare },
  { label: "Settings", href: "/settings", icon: Settings2 },
];

const springTransition = { type: "spring", stiffness: 400, damping: 20 } as const;

export function AppDock() {
  const { dockVisible } = useDock();
  const pathname = usePathname();

  return (
    <>
      <GlassFilter />
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
            <GlassEffect className="rounded-3xl">
              <div className="flex items-end gap-1 px-3 py-2.5">
                {dockItems.map((item) => {
                  const { label, icon: Icon } = item;
                  const isActive =
                    item.href !== undefined &&
                    (pathname === item.href || pathname.startsWith(item.href + "/"));

                  const iconNode = (
                    <motion.div
                      whileHover={{ scale: 1.25, y: -6 }}
                      whileTap={{ scale: 0.95 }}
                      transition={springTransition}
                      className={cn(
                        "w-12 h-12 flex items-center justify-center rounded-2xl transition-colors duration-200",
                        isActive ? "bg-white/40" : "hover:bg-white/20",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5.5 h-5.5 transition-colors",
                          isActive ? "text-black" : "text-black/65",
                        )}
                      />
                    </motion.div>
                  );

                  return item.href !== undefined ? (
                    <Link key={label} href={item.href} title={label}>
                      {iconNode}
                    </Link>
                  ) : (
                    <button key={label} onClick={item.action} title={label}>
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
