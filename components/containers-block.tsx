"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, Package, FileText, User, Hash, Box } from "lucide-react"
import { Input } from "@/components/ui/input"

interface ContainerData {
  id: number
  container_number: string
  invoice_number: string
  invoice_status?: boolean
  client_name: string
  order_id: number
  order_number?: string
}

interface ContainersBlockProps {
  dbError?: boolean
  selectedOrderId: number | null
  externalSearchQuery?: string
  showHeader?: boolean
}

export default function ContainersBlock({ dbError, selectedOrderId, externalSearchQuery, showHeader = true }: ContainersBlockProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredContainers, setFilteredContainers] = useState<ContainerData[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [totalCount, setTotalCount] = useState<number>(0)
  const ITEMS_PER_PAGE = 6

  const q = (externalSearchQuery ?? searchQuery).trim()

  useEffect(() => {
    // setCurrentPage(1)
  }, [selectedOrderId])

  useEffect(() => {
    if (!selectedOrderId) return

    let cancelled = false
    const loadOrderContainers = async () => {
      try {
        const res = await fetch("/api/search-containers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: selectedOrderId }),
        })
        if (!cancelled && res.ok) {
          const data = await res.json()
          setFilteredContainers(Array.isArray(data.containers) ? data.containers : [])
          setTotalCount(data.totalCount || 0)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading order containers:", error)
        }
      }
    }

    loadOrderContainers()

    return () => {
      cancelled = true
    }
  }, [selectedOrderId])

  useEffect(() => {
    if (!q || q.length < 4) {
      setFilteredContainers([])
      setTotalCount(0)
      setLoadingAll(false)
      return
    }

    setFilteredContainers([])
    setLoadingAll(true)
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/search-containers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            orderId: selectedOrderId || undefined,
          }),
        })
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json()
            setFilteredContainers(Array.isArray(data.containers) ? data.containers : [])
            setTotalCount(data.totalCount || 0)
          } else {
            setFilteredContainers([])
            setTotalCount(0)
          }
        }
      } catch {
        if (!cancelled) {
          setFilteredContainers([])
          setTotalCount(0)
        }
      } finally {
        if (!cancelled) setLoadingAll(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [externalSearchQuery, searchQuery, selectedOrderId])

  const containerWidthClass =
    !showHeader && !selectedOrderId ? "max-w-3xl w-full mx-auto" : ""


  return (
    <div className={`flex flex-col h-full ${containerWidthClass}`}>
      {/* Search Header (optional) */}
      {showHeader && (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              {selectedOrderId ? "Контейнеры заказа" : "Контейнеры"}
            </h2>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              placeholder="Поиск по номеру контейнера или инвойса..."
              value={externalSearchQuery ?? searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 h-12 text-sm rounded-full bg-card transition-all"
            />
          </div>
        </div>
      )}

      {/* Results Counter */}
      {selectedOrderId && (
        <div className="flex items-center justify-between mb-5 px-1">
          <span className="text-sm font-medium text-muted-foreground">
            {(externalSearchQuery ?? searchQuery) ? "Результаты поиска" : "Контейнеры в заказе"}
          </span>
          <span className="text-xs font-semibold bg-primary text-primary-foreground px-2.5 py-1 rounded-full">
            {totalCount}
          </span>
        </div>
      )}

      {/* Container Cards */}
      <div>
        {q.length < 4 ? null : loadingAll && !filteredContainers.length ? (
          <div className="flex flex-col justify-center items-center h-full py-16">
            <Loader2 className="w-7 h-7 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Загрузка контейнеров...</p>
          </div>
        ) : dbError || filteredContainers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-14">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <p className="text-base font-medium mb-1">
              {selectedOrderId && !q ? "Нет контейнеров в выбранном заказе" : q ? "Контейнеры не найдены" : "Нет контейнеров"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {q ? "Попробуйте изменить поисковый запрос" : "Данные появятся после добавления"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 w-full">
            {filteredContainers.map((container) => (
              <button
                key={container.id}
                onClick={() => {
                  router.push(`/invoice/${container.id}`)
                }}
                className="
                  group relative w-full text-left p-5 rounded-2xl
                  bg-card border border-border
                  hover:border-primary/50 hover:shadow-lg hover:-translate-y-px
                  transition-all duration-200 cursor-pointer
                "
              >
                <div className="flex flex-col gap-4">
                  {/* Top: container number & status */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                        <Box className="w-5 h-5" />
                      </div>
                      <div className="leading-tight">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Номер контейнера
                        </span>
                        <div className="text-lg font-semibold tracking-tight">
                          {container.container_number ? container.container_number.slice(0, 11) : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center self-start sm:self-center">
                      {container.invoice_status ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Исправленный инвойс</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          <span>Сделан по ПИ</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl overflow-hidden bg-border border border-border">
                    <div className="bg-card p-3 flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Заказ
                      </span>
                      <span className="text-sm font-semibold mt-1 break-all select-all">
                        {container.order_number || container.order_id || "—"}
                      </span>
                    </div>
                    <div className="bg-card p-3 flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Инвойс
                      </span>
                      <span className="text-sm font-semibold mt-1 truncate">
                        {container.invoice_number || "—"}
                      </span>
                    </div>
                    <div className="bg-card p-3 flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" /> Клиент
                      </span>
                      <span className="text-sm font-medium mt-1 truncate">
                        {container.client_name || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
