"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  nested?: boolean;
  children: React.ReactNode;
}

export function FormSection({
  title,
  description,
  defaultOpen = true,
  nested = false,
  children,
}: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [overflowVisible, setOverflowVisible] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "overflow-hidden",
        nested
          ? "rounded-lg border border-border-light/60 ml-3 border-l-2 border-l-border-light"
          : "rounded-xl border border-border-light",
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between bg-card hover:bg-muted/30 transition-colors text-left",
          nested ? "px-4 py-2.5" : "px-5 py-3.5",
        )}
      >
        <div>
          <p className={cn("font-semibold text-foreground", nested ? "text-xs" : "text-sm")}>
            {title}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "text-muted-foreground shrink-0 transition-transform duration-200",
            nested ? "w-3 h-3" : "w-4 h-4",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: overflowVisible ? "visible" : "hidden" }}
            onAnimationStart={() => setOverflowVisible(false)}
            onAnimationComplete={(def) => {
              if (def === "animate") setOverflowVisible(true);
            }}
          >
            <div className={cn("border-t border-border-light", nested ? "px-4 pb-4 pt-3" : "px-5 pb-6 pt-4")}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
