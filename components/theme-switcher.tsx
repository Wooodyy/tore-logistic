"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { Check, Moon, Palette, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

export const ACCENTS = [
  { id: "indigo", label: "Индиго", color: "oklch(0.55 0.22 277)" },
  { id: "violet", label: "Фиолетовый", color: "oklch(0.55 0.22 300)" },
  { id: "blue", label: "Синий", color: "oklch(0.55 0.22 255)" },
  { id: "emerald", label: "Изумруд", color: "oklch(0.55 0.17 160)" },
  { id: "orange", label: "Оранжевый", color: "oklch(0.66 0.19 50)" },
  { id: "pink", label: "Айсулу", color: "oklch(0.62 0.23 350)" },
] as const

export type AccentId = (typeof ACCENTS)[number]["id"]

const STORAGE_KEY = "tl-accent"

function applyAccent(id: string) {
  document.documentElement.setAttribute("data-accent", id)
}

/** Hook: current accent + setter (persisted in localStorage, applied to <html data-accent>) */
export function useAccent() {
  const [accent, setAccentState] = useState<AccentId>("indigo")

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AccentId | null
    if (saved && ACCENTS.some((a) => a.id === saved)) setAccentState(saved)
  }, [])

  const setAccent = useCallback((id: AccentId) => {
    setAccentState(id)
    localStorage.setItem(STORAGE_KEY, id)
    applyAccent(id)
  }, [])

  return { accent, setAccent }
}

/** Mode toggle with Telegram-style expanding circle */
function useModeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const setMode = useCallback(
    (next: "light" | "dark", origin?: HTMLElement | null) => {
      if (next === (isDark ? "dark" : "light")) return
      if (!origin || typeof document === "undefined" || !("startViewTransition" in document)) {
        setTheme(next)
        return
      }
      const rect = origin.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
      // @ts-ignore — View Transitions API
      const transition = document.startViewTransition(() => setTheme(next))
      transition.ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
          { duration: 420, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)", fill: "both" },
        )
      })
    },
    [isDark, setTheme],
  )

  return { isDark, setMode }
}

function ModeSegmented({ size = "md" }: { size?: "sm" | "md" }) {
  const { isDark, setMode } = useModeToggle()
  const pad = size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs"
  const btn = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
      pad,
      active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    )
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5">
      <button type="button" className={btn(!isDark)} onClick={(e) => setMode("light", e.currentTarget)}>
        <Sun className="h-3.5 w-3.5" /> Светлая
      </button>
      <button type="button" className={btn(isDark)} onClick={(e) => setMode("dark", e.currentTarget)}>
        <Moon className="h-3.5 w-3.5" /> Тёмная
      </button>
    </div>
  )
}

function AccentSwatches({ size = 22 }: { size?: number }) {
  const { accent, setAccent } = useAccent()
  return (
    <div className="flex items-center gap-2">
      {ACCENTS.map((a) => {
        const active = accent === a.id
        return (
          <button
            key={a.id}
            type="button"
            title={a.label}
            aria-label={a.label}
            aria-pressed={active}
            onClick={() => setAccent(a.id)}
            style={{ backgroundColor: a.color, width: size, height: size }}
            className={cn(
              "relative flex items-center justify-center rounded-full transition-transform hover:scale-110",
              active && "ring-2 ring-offset-2 ring-offset-background ring-foreground/70",
            )}
          >
            {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </button>
        )
      })}
    </div>
  )
}

/** Footer variant: one tidy row with mode + accent picker */
export function ThemeBar({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-8" />
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-6 gap-y-3", className)}>
      <ModeSegmented />
      <span className="hidden h-4 w-px bg-border sm:block" />
      <AccentSwatches />
    </div>
  )
}

/** Header variant: palette button that opens a small popover */
export function ThemePopover({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (!mounted) return <div className="h-9 w-9" />

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Оформление"
        title="Оформление"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-primary",
          open && "text-primary",
        )}
      >
        <Palette className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 space-y-4 rounded-2xl border border-border bg-popover p-4 shadow-xl animate-in fade-in zoom-in-95">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Режим</p>
            <ModeSegmented size="sm" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Акцентный цвет</p>
            <AccentSwatches size={24} />
          </div>
        </div>
      )}
    </div>
  )
}

