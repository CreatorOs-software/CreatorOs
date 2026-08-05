"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TRANSITION = { type: "spring", bounce: 0.05, duration: 0.3 } as const;

// ─── Context ──────────────────────────────────────────────────────────────────

interface PopoverContextType {
  isOpen: boolean;
  openPopover: (rect: DOMRect) => void;
  closePopover: () => void;
  uniqueId: string;
  note: string;
  setNote: (note: string) => void;
  triggerRect: DOMRect | null;
}

const PopoverContext = React.createContext<PopoverContextType | undefined>(undefined);

export function usePopover() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("usePopover must be used within a PopoverRoot");
  return ctx;
}

function usePopoverLogic() {
  const uniqueId = React.useId();
  const [isOpen, setIsOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null);

  const openPopover = React.useCallback((rect: DOMRect) => {
    setTriggerRect(rect);
    setIsOpen(true);
  }, []);

  const closePopover = React.useCallback(() => {
    setIsOpen(false);
    setNote("");
  }, []);

  return { isOpen, openPopover, closePopover, uniqueId, note, setNote, triggerRect };
}

// ─── Root ─────────────────────────────────────────────────────────────────────

interface PopoverRootProps {
  children: React.ReactNode;
  className?: string;
}

const PopoverRoot = React.forwardRef<HTMLDivElement, PopoverRootProps>(
  ({ children, className }, ref) => {
    const logic = usePopoverLogic();
    return (
      <PopoverContext.Provider value={logic}>
        <MotionConfig transition={TRANSITION}>
          <div ref={ref} className={cn("relative inline-flex items-center justify-center", className)}>
            {children}
            {/* Popover content is rendered via Portal – see PopoverContent */}
          </div>
        </MotionConfig>
      </PopoverContext.Provider>
    );
  },
);
PopoverRoot.displayName = "PopoverRoot";

// ─── Trigger ──────────────────────────────────────────────────────────────────

interface PopoverTriggerProps {
  children: React.ReactNode;
  className?: string;
}

const PopoverTrigger = React.forwardRef<HTMLDivElement, PopoverTriggerProps>(
  ({ children, className }, ref) => {
    const { isOpen, openPopover, closePopover } = usePopover();
    const innerRef = React.useRef<HTMLDivElement>(null);

    const handleClick = () => {
      if (isOpen) {
        closePopover();
        return;
      }
      const rect = innerRef.current?.getBoundingClientRect();
      if (rect) openPopover(rect);
    };

    return (
      <div
        ref={(el) => {
          innerRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        className={cn("inline-flex cursor-pointer", className)}
        onClick={handleClick}
      >
        {children}
      </div>
    );
  },
);
PopoverTrigger.displayName = "PopoverTrigger";

// ─── Content (Portal + Fixed) ─────────────────────────────────────────────────

interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
  width?: number;
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ children, className, width = 320 }, ref) => {
    const { isOpen, closePopover, triggerRect } = usePopover();
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => { setMounted(true); }, []);

    // Outside-click: delay by one tick so the opening click doesn't immediately close
    React.useEffect(() => {
      if (!isOpen) return;
      function handle(e: PointerEvent) {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          closePopover();
        }
      }
      const id = setTimeout(() => document.addEventListener("pointerdown", handle), 0);
      return () => {
        clearTimeout(id);
        document.removeEventListener("pointerdown", handle);
      };
    }, [isOpen, closePopover]);

    // Escape key
    React.useEffect(() => {
      if (!isOpen) return;
      function handle(e: KeyboardEvent) {
        if (e.key === "Escape") closePopover();
      }
      document.addEventListener("keydown", handle);
      return () => document.removeEventListener("keydown", handle);
    }, [isOpen, closePopover]);

    if (!mounted) return null;

    // Calculate position – open below trigger, clamped to viewport
    const top = triggerRect ? triggerRect.bottom + 8 : 0;
    const left = triggerRect
      ? Math.min(triggerRect.left, window.innerWidth - width - 16)
      : 0;

    return createPortal(
      <AnimatePresence>
        {isOpen && triggerRect && (
          <motion.div
            ref={(el) => {
              contentRef.current = el;
              if (typeof ref === "function") ref(el);
              else if (ref) ref.current = el;
            }}
            data-floating-portal=""
            className={cn(
              "fixed z-999 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg",
              className,
            )}
            style={{ top, left, width }}
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );
  },
);
PopoverContent.displayName = "PopoverContent";

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PopoverHeaderProps { children: React.ReactNode; className?: string }
const PopoverHeader = React.forwardRef<HTMLDivElement, PopoverHeaderProps>(
  ({ children, className }, ref) => (
    <div ref={ref} className={cn("border-b px-4 py-2.5 text-sm font-semibold text-foreground", className)}>
      {children}
    </div>
  ),
);
PopoverHeader.displayName = "PopoverHeader";

interface PopoverBodyProps { children: React.ReactNode; className?: string }
const PopoverBody = React.forwardRef<HTMLDivElement, PopoverBodyProps>(
  ({ children, className }, ref) => (
    <div ref={ref} className={cn("p-4", className)}>{children}</div>
  ),
);
PopoverBody.displayName = "PopoverBody";

interface PopoverFooterProps { children: React.ReactNode; className?: string }
const PopoverFooter = React.forwardRef<HTMLDivElement, PopoverFooterProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between border-t bg-muted/50 px-4 py-3", className)}
    >
      {children}
    </div>
  ),
);
PopoverFooter.displayName = "PopoverFooter";

interface PopoverFormProps {
  children: React.ReactNode;
  onSubmit?: (note: string) => void;
  className?: string;
}
const PopoverForm = React.forwardRef<HTMLFormElement, PopoverFormProps>(
  ({ children, onSubmit, className }, ref) => {
    const { note, closePopover } = usePopover();
    const handleSubmit = (e: React.SyntheticEvent) => {
      e.preventDefault();
      onSubmit?.(note);
      closePopover();
    };
    return (
      <form ref={ref} className={cn("flex h-full flex-col", className)} onSubmit={handleSubmit}>
        {children}
      </form>
    );
  },
);
PopoverForm.displayName = "PopoverForm";

interface PopoverLabelProps { children: React.ReactNode; className?: string }
const PopoverLabel = React.forwardRef<HTMLSpanElement, PopoverLabelProps>(
  ({ children, className }, ref) => {
    const { note } = usePopover();
    return (
      <span
        ref={ref}
        aria-hidden="true"
        style={{ opacity: note ? 0 : 1 }}
        className={cn("absolute left-4 top-3 select-none text-sm text-muted-foreground", className)}
      >
        {children}
      </span>
    );
  },
);
PopoverLabel.displayName = "PopoverLabel";

interface PopoverTextareaProps { className?: string; id?: string }
const PopoverTextarea = React.forwardRef<HTMLTextAreaElement, PopoverTextareaProps>(
  ({ className, id }, ref) => {
    const { note, setNote } = usePopover();
    return (
      <textarea
        ref={ref}
        id={id}
        className={cn(
          "h-full w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    );
  },
);
PopoverTextarea.displayName = "PopoverTextarea";

interface PopoverCloseButtonProps { className?: string }
const PopoverCloseButton = React.forwardRef<HTMLButtonElement, PopoverCloseButtonProps>(
  ({ className }, ref) => {
    const { closePopover } = usePopover();
    return (
      <Button
        ref={ref}
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(className)}
        onClick={closePopover}
        aria-label="Schließen"
      >
        <X className="size-4" />
      </Button>
    );
  },
);
PopoverCloseButton.displayName = "PopoverCloseButton";

interface PopoverSubmitButtonProps {
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}
const PopoverSubmitButton = React.forwardRef<HTMLButtonElement, PopoverSubmitButtonProps>(
  ({ children = "Speichern", className, variant = "default" }, ref) => (
    <Button ref={ref} type="submit" variant={variant} size="sm" className={className}>
      {children}
    </Button>
  ),
);
PopoverSubmitButton.displayName = "PopoverSubmitButton";

interface PopoverButtonProps { children: React.ReactNode; onClick?: () => void; className?: string }
const PopoverButton = React.forwardRef<HTMLButtonElement, PopoverButtonProps>(
  ({ children, onClick, className }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      className={cn("w-full justify-start gap-2 px-4 py-2 font-normal", className)}
      onClick={onClick}
    >
      {children}
    </Button>
  ),
);
PopoverButton.displayName = "PopoverButton";

export {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
  PopoverForm,
  PopoverLabel,
  PopoverTextarea,
  PopoverFooter,
  PopoverCloseButton,
  PopoverSubmitButton,
  PopoverHeader,
  PopoverBody,
  PopoverButton,
};
