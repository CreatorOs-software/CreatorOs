"use client";

import { useEffect, useRef } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@talentos/ui";
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
    const clipRight = Math.max(
      0,
      containerWidth - (offsetLeft + offsetWidth + 2),
    );
    overlay.style.clipPath = `inset(0 ${((clipRight / containerWidth) * 100).toFixed(2)}% 0 ${((clipLeft / containerWidth) * 100).toFixed(2)}%)`;
  }, [category]);

  return (
    <div className="relative flex w-full justify-around  gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        value={category}
        onValueChange={(v) => v && onCategory(v)}
        size="sm"
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat.id === category;
          return (
            <Tooltip key={cat.id}>
              <TooltipTrigger asChild>
                <span>
                  <ToggleGroupItem
                    value={cat.id}
                    ref={isActive ? activeRef : undefined}
                  >
                    {cat.icon}
                  </ToggleGroupItem>
                </span>
              </TooltipTrigger>
              <TooltipContent>{cat.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
