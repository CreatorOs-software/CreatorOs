"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface TableProgressProps {
  value: number
  segments?: number
  showPercentage?: boolean
  className?: string
}

export function TableProgress({
  value,
  segments = 10,
  showPercentage = true,
  className,
}: TableProgressProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null)
  const filledSegments = Math.round((value / 100) * segments)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="flex gap-[2px]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: segments }).map((_, index) => {
          const isFilled = index < filledSegments
          const isHovered = hoveredSegment === index

          return (
            <div
              key={index}
              onMouseEnter={() => setHoveredSegment(index)}
              onMouseLeave={() => setHoveredSegment(null)}
              style={{
                transform: (() => {
                  if (hoveredSegment === null) return "scaleY(1)"
                  const distance = Math.abs(hoveredSegment - index)
                  if (distance === 0) return "scaleY(1.4)"
                  if (distance <= 2) {
                    const scale = 1 + 0.3 * Math.cos((distance / 2) * (Math.PI / 2))
                    return `scaleY(${scale})`
                  }
                  return "scaleY(1)"
                })(),
              }}
              className={cn(
                "h-2.5 w-2.5 rounded-[3px] cursor-default origin-center",
                "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                isFilled ? "bg-accent" : "bg-muted/60",
                isHovered && isFilled && "brightness-110",
                isHovered && !isFilled && "bg-muted",
                hoveredSegment !== null && !isFilled && !isHovered && "bg-muted/40",
              )}
            />
          )
        })}
      </div>

      {showPercentage && (
        <span className="text-xs tabular-nums text-muted-foreground w-7 text-right">
          {value}%
        </span>
      )}
    </div>
  )
}
