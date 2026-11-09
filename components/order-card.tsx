"use client"

interface OrderData {
  id: number
  order_number: string
  client_name: string
  created_at: string
}

interface OrderCardProps {
  order: OrderData
  isSelected: boolean
  onSelect: (id: number) => void
}

export default function OrderCard({ order, isSelected, onSelect }: OrderCardProps) {
  return (
    <button
      onClick={() => onSelect(order.id)}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group ${
        isSelected
          ? "border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold truncate text-sm transition-colors ${
              isSelected ? "text-indigo-900" : "text-slate-900 group-hover:text-indigo-700"
            }`}
          >
            {order.order_number}
          </p>
          <p className="text-xs text-slate-500 mt-1.5 truncate">{order.client_name}</p>
          <p className="text-xs text-slate-400 mt-1">{new Date(order.created_at).toLocaleDateString("ru-RU")}</p>
        </div>
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 transition-all ${
            isSelected ? "bg-indigo-500 shadow-sm" : "bg-slate-300 group-hover:bg-slate-400"
          }`}
        />
      </div>
    </button>
  )
}
