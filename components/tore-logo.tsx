"use client"

import { cn } from "@/lib/utils"

interface ToreLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

/**
 * Tore Logistic official brand emblem:
 * A 3D isometric cargo container / logistics box with accent gradients.
 */
export function ToreLogo({ className, size = "md" }: ToreLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg",
    md: "w-9 h-9 rounded-xl",
    lg: "w-11 h-11 rounded-2xl",
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-transform",
        sizeClasses[size],
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[58%] h-[58%]"
      >
        {/* Isometric Cube / Container */}
        <path d="M12 2.5L20.5 7.4V16.6L12 21.5L3.5 16.6V7.4L12 2.5Z" fill="currentColor" fillOpacity="0.12" />
        <path d="M12 2.5V12M12 12L20.5 7.4M12 12L3.5 7.4" />
        <path d="M12 12V21.5" />
        {/* Container corrugated ribs */}
        <path d="M7.7 9.8V17.5" strokeOpacity="0.55" strokeWidth="1.4" />
        <path d="M16.3 9.8V17.5" strokeOpacity="0.55" strokeWidth="1.4" />
      </svg>
    </div>
  )
}

