"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedHeight({ children }: { children: React.ReactNode }) {
  "use no memo";
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h !== undefined) setHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      style={{ height: height !== undefined ? `${height}px` : undefined }}
      className="overflow-hidden transition-[height] duration-300 ease-in-out"
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
