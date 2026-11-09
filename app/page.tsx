"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import ContainersBlock from "@/components/containers-block"
import { ThemeBar } from "@/components/theme-switcher"
import { AntigravityField } from "@/components/antigravity-field"
import { ToreLogo } from "@/components/tore-logo"
import { Input } from "@/components/ui/input"
import { Upload, ShieldCheck, X, Search, FileCode2, FileSpreadsheet, ArrowUpRight } from "lucide-react"

export default function Page() {
  const router = useRouter()
  const [containersSearch, setContainersSearch] = useState("")
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Admin password dialog state
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [adminError, setAdminError] = useState("")

  const handleAdminClick = () => {
    const isAuthed = sessionStorage.getItem("admin_authenticated") === "2222"
    if (isAuthed) {
      router.push("/admin")
    } else {
      setAdminPassword("")
      setAdminError("")
      setShowAdminModal(true)
    }
  }

  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPassword.trim() === "2222") {
      sessionStorage.setItem("admin_authenticated", "2222")
      setShowAdminModal(false)
      router.push("/admin")
    } else {
      setAdminError("Неверный пароль")
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const response = await fetch("/api/all-orders", { cache: "no-store" })
        const data = await response.json()
        if (data.error || !data.orders) { /* noop */ }
      } catch { /* noop */ }
    }
    checkDatabase()
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (e.dataTransfer.types.includes("Files")) setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) setIsDraggingOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setIsDraggingOver(false)
    const files = Array.from(e.dataTransfer.files)
    const xmlFiles = files.filter(f =>
      f.name.toLowerCase().endsWith(".xml") || f.type === "text/xml" || f.type === "application/xml"
    )
    if (xmlFiles.length === 0) { alert("Пожалуйста, загрузите XML файл"); return }
    const file = xmlFiles[0]
    try {
      const text = await file.text()
      localStorage.setItem("uploadedXmlFileName", file.name)
      localStorage.setItem("uploadedXmlContent", text)
      window.location.href = `/xml-view/${encodeURIComponent(file.name)}`
    } catch (err) {
      console.error(err)
      alert(`Ошибка при чтении файла ${file.name}`)
    }
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.name.toLowerCase().endsWith(".xml") && file.type !== "text/xml" && file.type !== "application/xml") {
      alert("Пожалуйста, выберите XML файл"); return
    }
    try {
      const text = await file.text()
      localStorage.setItem("uploadedXmlFileName", file.name)
      localStorage.setItem("uploadedXmlContent", text)
      window.location.href = `/xml-view/${encodeURIComponent(file.name)}`
    } catch (err) {
      console.error(err)
      alert(`Ошибка при чтении файла ${file.name}`)
    }
  }, [])

  const handleBannerClick = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".xml,text/xml,application/xml"
    input.onchange = (e) => handleFileSelect(e as any)
    input.click()
  }, [handleFileSelect])

  // Переход на сайт КП с передачей текущих стилей (theme и accent)
  const handleOpenKpSite = useCallback(() => {
    const root = document.documentElement

    // 1. Определяем тему (light | dark)
    let theme = "light"
    if (
      root.classList.contains("dark") ||
      root.getAttribute("data-theme") === "dark" ||
      localStorage.getItem("theme") === "dark" ||
      localStorage.getItem("tore-theme") === "dark"
    ) {
      theme = "dark"
    }

    // 2. Определяем акцентный цвет (blue | indigo | violet | emerald | orange | pink)
    const validAccents = ["blue", "indigo", "violet", "emerald", "orange", "pink"]
    let accent = "blue"

    const candidates = [
      root.getAttribute("data-accent"),
      root.getAttribute("data-color"),
      localStorage.getItem("accent"),
      localStorage.getItem("tore-accent"),
      localStorage.getItem("color-accent"),
      localStorage.getItem("accent-color"),
    ]

    for (const item of candidates) {
      if (item && validAccents.includes(item)) {
        accent = item
        break
      }
    }

    if (accent === "blue") {
      for (const a of validAccents) {
        if (
          root.classList.contains(a) ||
          root.classList.contains(`accent-${a}`) ||
          root.classList.contains(`theme-${a}`)
        ) {
          accent = a
          break
        }
      }
    }

    const targetUrl = `https://data-map-vercel.vercel.app/?theme=${encodeURIComponent(theme)}&accent=${encodeURIComponent(accent)}`
    window.location.href = targetUrl
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const hasSearchQuery = containersSearch.trim().length >= 4

  return (
    <main className="relative min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300 overflow-hidden">
      {/* Interactive Antigravity-style particle background */}
      <AntigravityField />

      {/* Soft accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)]"
      />

      {/* Header */}
      <header className="relative z-30 w-full">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ToreLogo size="md" />
            <div className="leading-tight">
              <h1 className="text-[15px] font-semibold tracking-tight">Tore Logistic</h1>
              <p className="text-[11px] text-muted-foreground">Для набора и проверки ТД</p>
            </div>
          </div>

          <button
            onClick={handleAdminClick}
            aria-label="Управление базой"
            title="Управление базой"
            className="w-9 h-9 rounded-full border border-border bg-card text-muted-foreground hover:text-primary flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div
        className={`relative flex-1 flex flex-col items-center px-4 w-full transition-all duration-300 ${hasSearchQuery
          ? "pt-6 pb-16 justify-start"
          : "py-10 md:py-14 justify-center"
          }`}
      >
        <div className="w-full max-w-3xl px-2 md:px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Поиск <span className="text-primary">контейнера</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Номер контейнера или инвойса — от 4 символов
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="group relative rounded-full bg-card border border-border shadow-sm hover:border-primary/40 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-200">
              <div className="relative flex items-center">
                <Search className="absolute left-5 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary pointer-events-none transition-colors" />
                <Input
                  placeholder="Введите номер контейнера или инвойса..."
                  value={containersSearch}
                  onChange={(e) => setContainersSearch(e.target.value)}
                  className="w-full h-14 pr-12 pl-13 text-base font-medium border-none outline-none placeholder:text-muted-foreground/70 bg-transparent dark:bg-transparent focus-visible:ring-0 focus:ring-0 shadow-none rounded-full"
                  autoFocus
                />
                {containersSearch && (
                  <button
                    onClick={() => setContainersSearch("")}
                    className="absolute right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Очистить поиск"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasSearchQuery ? (
          <div className="w-full max-w-3xl px-2 md:px-6 mt-8">
            <ContainersBlock
              selectedOrderId={null}
              showHeader={false}
              externalSearchQuery={containersSearch}
            />
          </div>
        ) : (
          <div
            className="w-full max-w-3xl px-2 md:px-6 mt-8"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="max-w-2xl mx-auto">
              <button
                onClick={handleBannerClick}
                className={`
                  group w-full text-left cursor-pointer
                  flex items-center gap-5 rounded-3xl px-6 py-10 md:py-12 min-h-[170px]
                  border border-dashed transition-all duration-200
                  ${isDraggingOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card/50 hover:border-primary/50 hover:bg-card"
                  }
                `}
              >
                <div className={`w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 transition-transform ${isDraggingOver ? "scale-110" : "group-hover:scale-105"}`}>
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">
                      {isDraggingOver ? "Отпустите файл XML сюда" : "Загрузить ТД из XML файла"}
                    </h3>
                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary">
                      <FileCode2 className="w-3 h-3" /> XML
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isDraggingOver
                      ? "Просмотр ТД откроется автоматически после чтения файла."
                      : "Перетащите файл декларации сюда или нажмите для выбора"}
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Кнопка "Загрузить КП на набор" прямо над футером */}
      {!hasSearchQuery && (
        <div className="relative z-10 w-full px-4 pb-5 flex justify-center">
          <button
            onClick={handleOpenKpSite}
            className="group relative inline-flex items-center gap-3 rounded-full pl-2 pr-5 py-2 border border-border/80 bg-card/80 backdrop-blur-md hover:border-primary/50 hover:bg-card shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
              Загрузить КП на набор
            </span>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Footer: appearance */}
      <footer className="relative z-10 border-t border-border/70 py-5 px-4">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-3">
          <ThemeBar />
          <p className="text-[11px] text-muted-foreground">© Tore Logistic</p>
        </div>
      </footer>

      {/* Password Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ToreLogo size="md" />
                <div className="leading-tight">
                  <h3 className="text-base font-semibold">Tore Logistic</h3>
                  <p className="text-[11px] text-muted-foreground">Введите пароль для продолжения</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminPasswordSubmit} className="space-y-4 pt-1">
              <div>
                <Input
                  type="password"
                  placeholder="Пароль"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value)
                    if (adminError) setAdminError("")
                  }}
                  className="w-full h-12 text-center text-base rounded-xl bg-background"
                  autoFocus
                />
                {adminError && (
                  <p className="text-xs text-destructive font-medium text-center mt-2">
                    {adminError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="w-1/2 h-10 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-10 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
                >
                  Войти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}