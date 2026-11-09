"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Search, Loader2, CheckCircle2, ClipboardList } from "lucide-react"
import { Input } from "@/components/ui/input"

interface OrderData {
  id: number
  order_number: string
  client_name: string
  created_at: string
}

interface OrdersBlockProps {
  dbError: boolean
  onOrderSelect: (orderId: number | null, orderNumber?: string | null) => void
}

export default function OrdersBlock({ dbError, onOrderSelect }: OrdersBlockProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [allOrders, setAllOrders] = useState<OrderData[]>([])
  const [filteredOrders, setFilteredOrders] = useState<OrderData[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadAllOrders = async () => {
      try {
        const response = await fetch("/api/all-orders", {
          cache: 'no-store' // Всегда получаем актуальные данные
        })
        if (!cancelled) {
          if (response.ok) {
            const data = await response.json()
            setAllOrders(data.orders || [])
            setFilteredOrders(data.orders || [])
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading orders:", error)
        }
      } finally {
        if (!cancelled) {
          setLoadingAll(false)
        }
      }
    }

    loadAllOrders()

    return () => {
      cancelled = true
    }
  }, [])

  // Локальная фильтрация для быстрого поиска (мемоизирована)
  const locallyFiltered = useMemo(() => {
    if (!searchQuery.trim()) {
      return allOrders
    }

    const query = searchQuery.toLowerCase().trim()
    return allOrders.filter((order) => {
      return (
        order.order_number?.toLowerCase().includes(query) ||
        order.client_name?.toLowerCase().includes(query)
      )
    })
  }, [allOrders, searchQuery])

  useEffect(() => {
    // Всегда используем локальную фильтрацию - она мгновенная и не требует сетевых запросов
    setFilteredOrders(locallyFiltered)
  }, [locallyFiltered])

  const handleOrderClick = useCallback((order: OrderData) => {
    const newSelectedId = selectedId === order.id ? null : order.id
    setSelectedId(newSelectedId)
    onOrderSelect(newSelectedId, newSelectedId ? order.order_number : null)
  }, [selectedId, onOrderSelect])

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-50 ring-1 ring-emerald-200/60">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Заказы</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
          <Input
            placeholder="Поиск по номеру или заказчику..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-sm border-2 border-slate-200 rounded-xl focus:border-slate-400 focus:ring-2 focus:ring-slate-100 bg-white/80 backdrop-blur-sm transition-all shadow-sm hover:shadow-md"
          />
        </div>
      </div>

      {/* Results Counter */}
      <div className="flex items-center justify-between mb-5 px-1">
        <span className="text-sm font-medium text-slate-600">
          {searchQuery ? "Результаты поиска" : "Все заказы"}
        </span>
        <span className="text-sm font-bold bg-slate-700 text-white px-3 py-1.5 rounded-full shadow-sm">
          {filteredOrders.length}
        </span>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loadingAll && !filteredOrders.length ? (
          <div className="flex flex-col justify-center items-center h-full">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Загрузка заказов...</p>
          </div>
        ) : dbError || filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
            <div className="w-full max-w-xs rounded-xl border border-dashed border-slate-200 bg-white/70 py-8">
              <p className="text-base text-slate-600 font-semibold">
                {searchQuery ? "Заказы не найдены" : "Нет заказов"}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {searchQuery ? "Попробуйте изменить поисковый запрос" : "Данные появятся после добавления"}
              </p>
            </div>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const formattedDate = new Date(order.created_at).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })

            return (
              <div
                key={order.id}
                onClick={() => handleOrderClick(order)}
                className={`rounded-xl border transition-all duration-200 cursor-pointer group ${
                  selectedId === order.id
                    ? "bg-slate-50 border-slate-400 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-lg font-semibold text-slate-900 truncate transition-colors ${
                          selectedId === order.id ? "text-slate-800" : "group-hover:text-slate-700"
                        }`}
                      >
                        {order.order_number}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Время загрузки на сайт: {formattedDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 md:ml-auto">
                      <span className="max-w-[260px] rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm ring-1 ring-indigo-300/40 transition-all hover:brightness-95 truncate">
                        {order.client_name || "Без имени"}
                      </span>
                    </div>

                    {selectedId === order.id && <CheckCircle2 className="w-5 h-5 text-slate-600 shrink-0 md:ml-2" />}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}