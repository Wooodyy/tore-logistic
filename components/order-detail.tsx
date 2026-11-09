"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface InvoiceItem {
  id: number
  code: string
  goods_name: string
  places: number
  weight: number
  value_amount: number
  currency: string
}

interface Invoice {
  id: number
  invoice_number: string
  invoice_date: string
  container: string
  consignor: string
  consignee: string
  sender_address: string
  recipient_address: string
  items: InvoiceItem[]
}

interface OrderDetail {
  order_id: number
  order_number: string
  client_name: string
  created_at: string
  invoices: Invoice[]
}

interface OrderDetailProps {
  orderId: number
}

export default function OrderDetail({ orderId }: OrderDetailProps) {
  const [data, setData] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(false)

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true)
      setDbError(false)
      try {
        const response = await fetch(`/api/order/${orderId}`)
        const result = await response.json()

        if (result.error?.includes("Ошибка подключения")) {
          setDbError(true)
        } else {
          setData(result.data)
        }
      } catch (error) {
        console.error("Fetch error:", error)
        setDbError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [orderId])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (dbError) {
    return (
      <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-rose-200 rounded-2xl p-12 bg-gradient-to-br from-rose-50 to-red-50">
        <div className="w-16 h-16 rounded-full bg-red-100 mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-red-700 text-center font-semibold">Ошибка подключения БД</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-12 bg-gradient-to-br from-slate-50 to-white">
        <p className="text-slate-500 text-center font-500">Данные не найдены</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card className="p-6 border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Номер заказа</div>
              <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{data.order_number}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Клиент</div>
              <div className="text-slate-900 font-semibold mt-2">{data.client_name}</div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Дата создания</div>
            <div className="text-slate-700 mt-2 text-sm">
              {new Date(data.created_at).toLocaleDateString("ru-RU", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide mb-4">Контейнеры в заказе</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.invoices && data.invoices.length > 0 ? (
            data.invoices.map((invoice) => (
              <Card
                key={invoice.id}
                className="p-4 border-2 border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-md transition-shadow"
              >
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Номер контейнера</div>
                <div className="text-xl font-bold text-slate-900 mt-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{invoice.container || "—"}</div>
                <div className="text-xs text-slate-600 mt-3">Инвойс: {invoice.invoice_number}</div>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-slate-500 text-sm">Нет контейнеров</div>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Инвойсы</h2>
        {data.invoices.map((invoice) => (
          <Card key={invoice.id} className="p-6 border-2 border-slate-200 bg-white shadow-sm space-y-5">
            {/* Invoice Header */}
            <div className="grid grid-cols-3 gap-4 pb-5 border-b-2 border-slate-200">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Инвойс</div>
                <div className="text-slate-900 font-semibold mt-1.5 font-mono">{invoice.invoice_number}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Контейнер</div>
                <div className="text-slate-900 font-semibold mt-1.5 font-mono">{invoice.container || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Дата</div>
                <div className="text-slate-700 mt-1.5 text-sm">
                  {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString("ru-RU") : "-"}
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">От кого</div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-slate-200">
                  <div className="font-semibold text-slate-900">{invoice.consignor || "-"}</div>
                  <div className="text-xs text-slate-600 mt-2">{invoice.sender_address || "-"}</div>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Кому</div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-lg border border-slate-200">
                  <div className="font-semibold text-slate-900">{invoice.consignee || "-"}</div>
                  <div className="text-xs text-slate-600 mt-2">{invoice.recipient_address || "-"}</div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Товары</div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Код
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Наименование
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Мест
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Вес
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Стоимость
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-200 transition-colors ${
                          index % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-slate-50 hover:bg-blue-50"
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-700 font-mono text-xs">{item.code || "-"}</td>
                        <td className="py-3 px-4 text-slate-900 font-medium">{item.goods_name}</td>
                        <td className="py-3 px-4 text-right text-slate-700 font-medium">{item.places}</td>
                        <td className="py-3 px-4 text-right text-slate-700 font-medium">{item.weight} кг</td>
                        <td className="py-3 px-4 text-right font-bold text-indigo-600">
                          {item.value_amount} {item.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
