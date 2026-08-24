"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "./constants";

type Props = {
  category: string;
  onCategory: (c: string) => void;
};

export function CategorySelect({ category, onCategory }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const active = activeRef.current;
    if (!overlay || !active) return;
    const { offsetLeft, offsetWidth } = active;
    const containerWidth = overlay.offsetWidth;
    if (!containerWidth) return;
    const clipLeft = Math.max(0, offsetLeft - 2);
    const clipRight = Math.max(0, containerWidth - (offsetLeft + offsetWidth + 2));
    overlay.style.clipPath = `inset(0 ${((clipRight / containerWidth) * 100).toFixed(2)}% 0 ${((clipLeft / containerWidth) * 100).toFixed(2)}%)`;
  }, [category]);

  const renderButtons = (isOverlay: boolean) =>
    CATEGORIES.map((cat) => {
      const isActive = cat.id === category;
      return (
        <button
          key={cat.id}
          ref={!isOverlay && isActive ? activeRef : undefined}
          onClick={() => onCategory(cat.id)}
          tabIndex={isOverlay ? -1 : undefined}
          className={cn(
            "flex h-8 items-center justify-center gap-1 overflow-hidden rounded-md border transition-all duration-300 ease-out",
            isActive
              ? cn("flex-1 border-none px-3 text-white", cat.color)
              : "w-8 border-[#E7E7E7] bg-white hover:bg-gray-100",
          )}
        >
          <div className="relative shrink-0">{cat.icon}</div>
          {isActive && (
            <span className="animate-in fade-in-0 slide-in-from-right-4 text-sm leading-none text-white duration-300">
              {cat.label}
            </span>
          )}
        </button>
      );
    });

  return (
    <div className="relative flex w-full gap-2">
      {renderButtons(false)}
      <div
        aria-hidden
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 z-10 flex gap-2 overflow-hidden transition-[clip-path] duration-300 ease-in-out"
      >
        {renderButtons(true)}
      </div>
    </div>
  );
}
