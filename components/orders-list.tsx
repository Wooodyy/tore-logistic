"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"

interface OrderData {
  id: number
  order_number: string
  client_name: string
  created_at: string
  containers?: string[]
}

interface OrdersListProps {
  searchQuery: string
  searchType: "order" | "container"
  selectedId: number | null
  onSelect: (id: number) => void
}

export default function OrdersList({ searchQuery, searchType, selectedId, onSelect }: OrdersListProps) {
  const [orders, setOrders] = useState<OrderData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchOrders = async () => {
      if (!searchQuery.trim()) {
        setOrders([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchQuery,
            type: searchType,
          }),
        })

        const data = await response.json()
        setOrders(data.orders || [])
      } catch (error) {
        console.error("Search error:", error)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchOrders, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchType])

  if (!searchQuery.trim()) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Введите поисковый запрос</div>
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Поиск...</div>
  }

  if (orders.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Заказы не найдены</div>
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <Card
          key={order.id}
          className={`p-4 cursor-pointer transition-all border ${
            selectedId === order.id ? "border-accent bg-card shadow-md" : "border-border hover:border-accent"
          }`}
          onClick={() => onSelect(order.id)}
        >
          <div className="font-medium text-sm text-foreground truncate">{order.order_number}</div>
          <div className="text-xs text-muted-foreground mt-1">{order.client_name}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(order.created_at).toLocaleDateString("ru-RU")}
          </div>
        </Card>
      ))}
    </div>
  )
}
