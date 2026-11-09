"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2, Package, Copy, Check, Pencil, Sun, Moon, CheckCircle2, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { ThemePopover } from "@/components/theme-switcher"
import { ToreLogo } from "@/components/tore-logo"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Decimal from "decimal.js"

interface InvoiceData {
  id: number
  container_number: string | null
  invoice_number: string | null
  invoice_date: string | null
  invoice_status: boolean | null
  consignor: string | null
  consignee: string | null
  sender_address: string | null
  recipient_address: string | null
  items: Array<{
    id: number
    code: string | null
    goods_name: string | null
    places: number | null
    weight: string | null  // Текстовое значение из БД для сохранения полной точности
    value_amount: string | null  // Текстовое значение из БД для сохранения полной точности
    currency: string | null
    packaging_type: string | null
    packaging_info: boolean | null
  }>
}

function InvoicePage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [packagingTypes, setPackagingTypes] = useState<Record<number, string>>({})
  const [packagingInfos, setPackagingInfos] = useState<Record<number, boolean>>({})
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const toggleBtnRef = useRef<HTMLButtonElement>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InvoiceData['items'][0] | null>(null)
  const [editFormData, setEditFormData] = useState<{
    code: string
    goods_name: string
    places: string
    weight: string
    value_amount: string
    currency: string
    packaging_type: string
    packaging_info: string
  }>({
    code: '',
    goods_name: '',
    places: '',
    weight: '',
    value_amount: '',
    currency: '',
    packaging_type: 'PK',
    packaging_info: '0'
  })
  const editFormDataRef = useRef(editFormData)
  const { toast } = useToast()

  useEffect(() => setMounted(true), [])

  // Telegram-style expanding circle transition
  const handleThemeToggle = useCallback(() => {
    const isDark = resolvedTheme === "dark"
    const nextTheme = isDark ? "light" : "dark"

    const btn = toggleBtnRef.current
    if (!btn || typeof document === "undefined") {
      setTheme(nextTheme)
      return
    }

    // Check for View Transitions API support
    if (!("startViewTransition" in document)) {
      setTheme(nextTheme)
      return
    }



    loadInvoice()

    return () => {
      cancelled = true
    }
  }, [invoiceId])

  // Синхронизируем packagingTypes и packagingInfos с данными из БД при изменении invoice
  useEffect(() => {
    if (invoice?.items) {
      setPackagingTypes(prev => {
        const updated = { ...prev }
        invoice.items.forEach(item => {
          // Всегда используем значение из БД как источник истины, если null - используем "PK" по умолчанию
          updated[item.id] = item.packaging_type || "PK"
        })
        return updated
      })
      setPackagingInfos(prev => {
        const updated = { ...prev }
        invoice.items.forEach(item => {
          // Всегда используем значение из БД как источник истины, если null - используем false (0) по умолчанию
          updated[item.id] = item.packaging_info !== null && item.packaging_info !== undefined ? item.packaging_info : false
        })
        return updated
      })
    }
  }, [invoice?.items])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])


  const handleCopy = useCallback(async (text: string, fieldName: string) => {
    if (!text || text === "—") return

    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [])

  const handlePackagingTypeChange = useCallback(async (itemId: number, value: string) => {
    // Не принимаем пустые значения, используем значение по умолчанию
    if (!value) return

    // Обновляем локальное состояние сразу для быстрого отклика
    setPackagingTypes(prev => ({
      ...prev,
      [itemId]: value
    }))

    // Сохраняем в базу данных
    try {
      const res = await fetch(`/api/invoice/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          packagingType: value || null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("Failed to update packaging type:", errorData)
        // Откатываем изменение при ошибке
        setPackagingTypes(prev => {
          const updated = { ...prev }
          if (invoice?.items.find(it => it.id === itemId)?.packaging_type) {
            updated[itemId] = invoice.items.find(it => it.id === itemId)!.packaging_type!
          } else {
            delete updated[itemId]
          }
          return updated
        })
        toast({
          variant: "destructive",
          title: "Ошибка обновления",
          description: "Не удалось обновить вид упаковки. Попробуйте еще раз.",
        })
      } else {
        // Обновляем invoice в состоянии для синхронизации
        setInvoice(prev => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.map(item =>
              item.id === itemId
                ? { ...item, packaging_type: value || null }
                : item
            )
          }
        })
        toast({
          title: "Успешно обновлено",
          description: "Вид упаковки успешно обновлен в базе данных.",
        })
      }
    } catch (err) {
      console.error("Error updating packaging type:", err)
      // Откатываем изменение при ошибке
      setPackagingTypes(prev => {
        const updated = { ...prev }
        if (invoice?.items.find(it => it.id === itemId)?.packaging_type) {
          updated[itemId] = invoice.items.find(it => it.id === itemId)!.packaging_type!
        } else {
          delete updated[itemId]
        }
        return updated
      })
      toast({
        variant: "destructive",
        title: "Ошибка обновления",
        description: "Произошла ошибка при обновлении вида упаковки. Попробуйте еще раз.",
      })
    }
  }, [invoiceId, invoice, toast])

  const handlePackagingInfoChange = useCallback(async (itemId: number, value: string) => {
    // Конвертируем строку в boolean: "0" -> false, "1" -> true
    const boolValue = value === "1"

    // Обновляем локальное состояние сразу для быстрого отклика
    setPackagingInfos(prev => ({
      ...prev,
      [itemId]: boolValue
    }))

    // Сохраняем в базу данных
    try {
      const res = await fetch(`/api/invoice/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          packagingInfo: boolValue,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("Failed to update packaging info:", errorData)
        // Откатываем изменение при ошибке
        setPackagingInfos(prev => {
          const updated = { ...prev }
          const item = invoice?.items.find(it => it.id === itemId)
          if (item) {
            updated[itemId] = item.packaging_info !== null && item.packaging_info !== undefined ? item.packaging_info : false
          } else {
            delete updated[itemId]
          }
          return updated
        })
        toast({
          variant: "destructive",
          title: "Ошибка обновления",
          description: "Не удалось обновить информацию об упаковке. Попробуйте еще раз.",
        })
      } else {
        // Обновляем invoice в состоянии для синхронизации
        setInvoice(prev => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.map(item =>
              item.id === itemId
                ? { ...item, packaging_info: boolValue }
                : item
            )
          }
        })
        toast({
          title: "Успешно обновлено",
          description: "Информация об упаковке успешно обновлена в базе данных.",
        })
      }
    } catch (err) {
      console.error("Error updating packaging info:", err)
      // Откатываем изменение при ошибке
      setPackagingInfos(prev => {
        const updated = { ...prev }
        if (invoice?.items.find(it => it.id === itemId)?.packaging_info !== null && invoice?.items.find(it => it.id === itemId)?.packaging_info !== undefined) {
          updated[itemId] = invoice.items.find(it => it.id === itemId)!.packaging_info!
        } else {
          delete updated[itemId]
        }
        return updated
      })
      toast({
        variant: "destructive",
        title: "Ошибка обновления",
        description: "Произошла ошибка при обновлении информации об упаковке. Попробуйте еще раз.",
      })
    }
  }, [invoiceId, invoice, toast])

  const handleAllPackagingInfoChange = useCallback(async (value: string) => {
    if (!invoice?.items || invoice.items.length === 0) return
    // Не принимаем пустые значения
    if (!value) return

    // Конвертируем строку в boolean: "0" -> false, "1" -> true
    const boolValue = value === "1"

    // Обновляем локальное состояние для всех товаров сразу
    const updatedInfos: Record<number, boolean> = {}
    invoice.items.forEach(item => {
      updatedInfos[item.id] = boolValue
    })
    setPackagingInfos(updatedInfos)

    // Сохраняем в базу данных
    try {
      const res = await fetch(`/api/invoice/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updateAllPackagingInfo: true,
          packagingInfo: boolValue,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("Failed to update all packaging info:", errorData)
        // Откатываем изменение при ошибке
        const revertedInfos: Record<number, boolean> = {}
        invoice.items.forEach(item => {
          revertedInfos[item.id] = item.packaging_info !== null && item.packaging_info !== undefined ? item.packaging_info : false
        })
        setPackagingInfos(revertedInfos)
        toast({
          variant: "destructive",
          title: "Ошибка обновления",
          description: "Не удалось обновить информацию об упаковке для всех товаров. Попробуйте еще раз.",
        })
      } else {
        // Обновляем invoice в состоянии для синхронизации
        setInvoice(prev => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.map(item => ({
              ...item,
              packaging_info: boolValue
            }))
          }
        })
        toast({
          title: "Успешно обновлено",
          description: `Информация об упаковке успешно обновлена для всех товаров (${invoice.items.length} шт.) в базе данных.`,
        })
      }
    } catch (err) {
      console.error("Error updating all packaging info:", err)
      // Откатываем изменение при ошибке
      const revertedInfos: Record<number, boolean> = {}
      invoice.items.forEach(item => {
        revertedInfos[item.id] = item.packaging_info !== null && item.packaging_info !== undefined ? item.packaging_info : false
      })
      setPackagingInfos(revertedInfos)
      toast({
        variant: "destructive",
        title: "Ошибка обновления",
        description: "Произошла ошибка при обновлении информации об упаковке для всех товаров. Попробуйте еще раз.",
      })
    }
  }, [invoiceId, invoice, toast])

  const handleAllPackagingTypeChange = useCallback(async (value: string) => {
    if (!invoice?.items || invoice.items.length === 0) return
    // Не принимаем пустые значения
    if (!value) return

    // Обновляем локальное состояние для всех товаров сразу
    const updatedTypes: Record<number, string> = {}
    invoice.items.forEach(item => {
      updatedTypes[item.id] = value
    })
    setPackagingTypes(updatedTypes)

    // Сохраняем в базу данных
    try {
      const res = await fetch(`/api/invoice/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updateAll: true,
          packagingType: value || null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("Failed to update all packaging types:", errorData)
        // Откатываем изменение при ошибке
        const revertedTypes: Record<number, string> = {}
        invoice.items.forEach(item => {
          if (item.packaging_type) {
            revertedTypes[item.id] = item.packaging_type
          }
        })
        setPackagingTypes(revertedTypes)
        toast({
          variant: "destructive",
          title: "Ошибка обновления",
          description: "Не удалось обновить вид упаковки для всех товаров. Попробуйте еще раз.",
        })
      } else {
        // Обновляем invoice в состоянии для синхронизации
        setInvoice(prev => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.map(item => ({
              ...item,
              packaging_type: value || null
            }))
          }
        })
        toast({
          title: "Успешно обновлено",
          description: `Вид упаковки успешно обновлен для всех товаров (${invoice.items.length} шт.) в базе данных.`,
        })
      }
    } catch (err) {
      console.error("Error updating all packaging types:", err)
      // Откатываем изменение при ошибке
      const revertedTypes: Record<number, string> = {}
      invoice.items.forEach(item => {
        if (item.packaging_type) {
          revertedTypes[item.id] = item.packaging_type
        }
      })
      setPackagingTypes(revertedTypes)
      toast({
        variant: "destructive",
        title: "Ошибка обновления",
        description: "Произошла ошибка при обновлении вида упаковки для всех товаров. Попробуйте еще раз.",
      })
    }
  }, [invoiceId, invoice, toast])

  const handleAllCurrencyChange = useCallback(async (value: string) => {
    if (!invoice?.items || invoice.items.length === 0) return
    // Не принимаем пустые значения
    if (!value) return

    // Сохраняем в базу данных
    try {
      const res = await fetch(`/api/invoice/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updateAllCurrency: true,
          currency: value || null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("Failed to update all currencies:", errorData)
        toast({
          variant: "destructive",
          title: "Ошибка обновления",
          description: "Не удалось обновить валюту для всех товаров. Попробуйте еще раз.",
        })
      } else {
        // Обновляем invoice в состоянии для синхронизации
        setInvoice(prev => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.map(item => ({
              ...item,
              currency: value || null
            }))
          }
        })
        toast({
          title: "Успешно обновлено",
          description: `Валюта успешно обновлена для всех товаров (${invoice.items.length} шт.) в базе данных.`,
        })
      }
    } catch (err) {
      console.error("Error updating all currencies:", err)
      toast({
        variant: "destructive",
        title: "Ошибка обновления",
        description: "Произошла ошибка при обновлении валюты для всех товаров. Попробуйте еще раз.",
      })
    }
  }, [invoiceId, invoice, toast])

  // Собираем все уникальные значения вида упаковки из всех товаров
  const allPackagingTypes = useMemo(() => {
    const standardTypes = ['PK', 'CS', 'CT', 'FR', 'NG', 'PP', 'BG', 'BX', 'NF', 'PX']
    const dbTypes = new Set<string>()

    if (invoice?.items) {
      invoice.items.forEach(item => {
        if (item.packaging_type && !standardTypes.includes(item.packaging_type)) {
          dbTypes.add(item.packaging_type)
        }
      })
    }

    return Array.from(dbTypes)
  }, [invoice?.items])

  // Вычисляем итоги без округления, сохраняя полную точность
  // Используем Decimal.js для точных вычислений с десятичными числами
  const totals = useMemo(() => {
    if (!invoice?.items || invoice.items.length === 0) {
      return {
        itemsCount: 0,
        totalPlaces: 0,
        totalWeight: '0',
        totalValue: '0'
      }
    }

    let totalPlaces = 0
    let totalWeight = new Decimal(0)
    let totalValue = new Decimal(0)

    invoice.items.forEach(item => {
      if (item.places) {
        totalPlaces += Number(item.places)
      }
      if (item.weight) {
        try {
          // Decimal.js поддерживает строковые значения и автоматически парсит их
          const weightDecimal = new Decimal(item.weight)
          totalWeight = totalWeight.plus(weightDecimal)
        } catch (e) {
          // Если не удалось распарсить, пропускаем
          console.warn('Failed to parse weight:', item.weight, e)
        }
      }
      if (item.value_amount) {
        try {
          // Decimal.js поддерживает строковые значения и автоматически парсит их
          const valueDecimal = new Decimal(item.value_amount)
          totalValue = totalValue.plus(valueDecimal)
        } catch (e) {
          // Если не удалось распарсить, пропускаем
          console.warn('Failed to parse value_amount:', item.value_amount, e)
        }
      }
    })

    return {
      itemsCount: invoice.items.length,
      totalPlaces,
      // Преобразуем Decimal обратно в строку, сохраняя полную точность
      totalWeight: totalWeight.toString(),
      totalValue: totalValue.toString()
    }
  }, [invoice?.items])

  // Проверяем, есть ли товары с нулевыми значениями
  const hasZeroValues = useMemo(() => {
    if (!invoice?.items || invoice.items.length === 0) return false

    return invoice.items.some(item => {
      const weightErr = item.weight && new Decimal(item.weight).lessThan(0.001)
      const valueErr = item.value_amount && new Decimal(item.value_amount).lessThan(0.01)
      return weightErr || valueErr
    })
  }, [invoice?.items])

  // Функция форматирования чисел с запятой вместо точки для русской локализации
  // Сохраняет все знаки после запятой без округления и обрезания
  const formatNumber = useCallback((value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') {
      return ''
    }

    // Преобразуем значение в строку, сохраняя полную точность
    let strValue: string

    if (typeof value === 'string') {
      strValue = value.trim()
    } else if (typeof value === 'number') {
      // Для чисел используем максимальную точность
      // Используем toPrecision для сохранения всех значащих цифр
      strValue = String(value)
    } else {
      return ''
    }

    // Проверяем, является ли это валидным числом
    const numCheck = parseFloat(strValue.replace(',', '.'))
    if (isNaN(numCheck)) {
      return ''
    }

    // Заменяем точку на запятую для русской локализации
    return strValue.replace('.', ',')
  }, [])

  const getColumnWidth = useCallback((header: string): string => {
    if (header === 'Коммерческое описание товара') {
      return '30%'
    } else if (header === 'Код ТН ВЭД') {
      return '7%'
    } else if (header === 'Номер контейнера') {
      return '10%'
    } else if (header === 'Валюта') {
      return '6%'
    } else if (header === 'Сумма') {
      return '8%'
    } else if (header === 'Вес брутто') {
      return '8%'
    } else {
      return '1%'
    }
  }, [])

  const handleEditItem = useCallback((item: InvoiceData['items'][0]) => {
    setEditingItem(item)
    setEditFormData({
      code: item.code || '',
      goods_name: item.goods_name || '',
      places: item.places ? String(item.places) : '',
      weight: item.weight ? formatNumber(item.weight) : '',
      value_amount: item.value_amount ? formatNumber(item.value_amount) : '',
      currency: item.currency || '',
      packaging_type: item.packaging_type || 'PK',
      packaging_info: item.packaging_info ? '1' : '0'
    })
    setIsEditModalOpen(true)
  }, [formatNumber])

  const handleSaveItem = useCallback(async () => {
    if (!editingItem) return

    // Используем актуальные значения из ref
    const currentFormData = editFormDataRef.current

    try {
      const res = await fetch(`/api/invoice/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: editingItem.id,
          code: currentFormData.code || null,
          goods_name: currentFormData.goods_name || null,
          places: currentFormData.places ? Number(currentFormData.places) : null,
          weight: currentFormData.weight ? currentFormData.weight.replace(',', '.') : null,
          value_amount: currentFormData.value_amount ? currentFormData.value_amount.replace(',', '.') : null,
          currency: currentFormData.currency || null,
          packagingType: currentFormData.packaging_type || null,
          packagingInfo: currentFormData.packaging_info === '1'
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("Failed to update item:", errorData)
        toast({
          variant: "destructive",
          title: "Ошибка обновления",
          description: "Не удалось обновить товар. Попробуйте еще раз.",
        })
        return
      }

      // Обновляем invoice в состоянии
      setInvoice(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(item =>
            item.id === editingItem.id
              ? {
                ...item,
                code: currentFormData.code || null,
                goods_name: currentFormData.goods_name || null,
                places: currentFormData.places ? Number(currentFormData.places) : null,
                weight: currentFormData.weight ? currentFormData.weight.replace(',', '.') : null,
                value_amount: currentFormData.value_amount ? currentFormData.value_amount.replace(',', '.') : null,
                currency: currentFormData.currency || null,
                packaging_type: currentFormData.packaging_type || null,
                packaging_info: currentFormData.packaging_info === '1'
              }
              : item
          )
        }
      })

      // Обновляем локальные состояния
      setPackagingTypes(prev => ({
        ...prev,
        [editingItem.id]: currentFormData.packaging_type || 'PK'
      }))
      setPackagingInfos(prev => ({
        ...prev,
        [editingItem.id]: currentFormData.packaging_info === '1'
      }))

      setIsEditModalOpen(false)
      setEditingItem(null)
      toast({
        title: "Успешно обновлено",
        description: "Товар успешно обновлен в базе данных.",
      })
    } catch (err) {
      console.error("Error updating item:", err)
      toast({
        variant: "destructive",
        title: "Ошибка обновления",
        description: "Произошла ошибка при обновлении товара. Попробуйте еще раз.",
      })
    }
  }, [editingItem, invoiceId, toast])

  const isDark = resolvedTheme === "dark"

  return (
    <main className="relative min-h-screen bg-background text-foreground transition-colors duration-300">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]" />
      {/* Header */}
      <header className="border-b border-border/70 bg-background/70 backdrop-blur-md sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-border bg-card hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <ToreLogo size="md" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    {invoice?.container_number ? `Контейнер ${invoice.container_number.slice(0, 11)}` : 'Контейнер'}
                  </h1>

                  {invoice && (
                    invoice.invoice_status ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="tracking-wide">Исправленный инвойс</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        <span className="tracking-wide">Сделан по ПИ</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Appearance: mode + accent */}
            <ThemePopover />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative w-full px-4 sm:px-6 py-6">
        <div className="transition-colors">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Загрузка данных...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-rose-400 dark:text-rose-500/60" />
              </div>
              <p className="text-base text-muted-foreground font-medium mb-1">{error}</p>
              <button
                onClick={handleBack}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-colors text-sm font-medium"
              >
                Вернуться назад
              </button>
            </div>
          ) : invoice ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Колонка отправителя */}
                <div className="flex flex-col space-y-2.5 bg-card border border-border rounded-2xl p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Отправитель
                  </p>

                  {/* Название отправителя */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 px-1">Название</p>
                    <button
                      onClick={() => {
                        if (invoice.consignor && invoice.consignor !== "—") {
                          handleCopy(invoice.consignor, "sender_name")
                        }
                      }}
                      className="group relative w-full bg-primary/[0.07] dark:bg-primary/[0.12] rounded-xl border border-primary/25 p-2.5 text-left hover:bg-primary/[0.12] dark:hover:bg-primary/[0.18] hover:border-primary/50 hover:shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-foreground break-words leading-snug">{invoice.consignor || "—"}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {copiedField === "sender_name" ? (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Адрес отправителя */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 px-1">Адрес</p>
                    <button
                      onClick={() => {
                        if (invoice.sender_address && invoice.sender_address !== "—") {
                          handleCopy(invoice.sender_address, "sender_address")
                        }
                      }}
                      className="group relative w-full bg-primary/[0.04] dark:bg-primary/[0.07] rounded-xl border border-primary/20 p-2.5 text-left hover:bg-primary/[0.09] dark:hover:bg-primary/[0.14] hover:border-primary/45 hover:shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground/85 break-words leading-snug">{invoice.sender_address || "—"}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {copiedField === "sender_address" ? (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Колонка получателя */}
                <div className="flex flex-col space-y-2.5 bg-card border border-border rounded-2xl p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Получатель
                  </p>

                  {/* Название получателя */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80 px-1">Название</p>
                    <button
                      onClick={() => {
                        if (invoice.consignee && invoice.consignee !== "—") {
                          handleCopy(invoice.consignee, "recipient_name")
                        }
                      }}
                      className="group relative w-full bg-emerald-500/[0.07] dark:bg-emerald-500/[0.12] rounded-xl border border-emerald-500/25 p-2.5 text-left hover:bg-emerald-500/[0.12] dark:hover:bg-emerald-500/[0.18] hover:border-emerald-500/50 hover:shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-foreground break-words leading-snug">{invoice.consignee || "—"}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {copiedField === "recipient_name" ? (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-emerald-600/70 dark:text-emerald-400/70 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Адрес получателя */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80 px-1">Адрес</p>
                    <button
                      onClick={() => {
                        if (invoice.recipient_address && invoice.recipient_address !== "—") {
                          handleCopy(invoice.recipient_address, "recipient_address")
                        }
                      }}
                      className="group relative w-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] rounded-xl border border-emerald-500/20 p-2.5 text-left hover:bg-emerald-500/[0.09] dark:hover:bg-emerald-500/[0.14] hover:border-emerald-500/45 hover:shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground/85 break-words leading-snug">{invoice.recipient_address || "—"}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {copiedField === "recipient_address" ? (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-emerald-600/70 dark:text-emerald-400/70 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Блок с информацией об инвойсе */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-card border border-border rounded-2xl p-3.5">
                {/* Номер контейнера */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider px-1">Номер контейнера</p>
                  <button
                    onClick={() => {
                      if (invoice.container_number && invoice.container_number !== "—") {
                        handleCopy(invoice.container_number.slice(0, 11), "container_number_info")
                      }
                    }}
                    className="group relative w-full bg-primary/[0.08] dark:bg-primary/[0.14] rounded-xl border border-primary/30 px-3 py-2.5 text-left hover:bg-primary/[0.14] dark:hover:bg-primary/[0.20] hover:border-primary/55 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex-1">
                        <p className="text-sm sm:text-base font-bold text-primary break-words">{invoice.container_number?.slice(0, 11) || "—"}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {copiedField === "container_number_info" ? (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Номер инвойса */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider px-1">Номер инвойса</p>
                  <button
                    onClick={() => {
                      if (invoice.invoice_number && invoice.invoice_number !== "—") {
                        handleCopy(invoice.invoice_number, "invoice_number_info")
                      }
                    }}
                    className="group relative w-full bg-sky-500/[0.08] dark:bg-sky-500/[0.14] rounded-xl border border-sky-500/30 px-3 py-2.5 text-left hover:bg-sky-500/[0.14] dark:hover:bg-sky-500/[0.20] hover:border-sky-500/55 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex-1">
                        <p className="text-sm sm:text-base font-bold text-sky-700 dark:text-sky-300 break-words">{invoice.invoice_number || "—"}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {copiedField === "invoice_number_info" ? (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-sky-600/70 dark:text-sky-400/70 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Дата инвойса */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider px-1">Дата инвойса</p>
                  <button
                    onClick={() => {
                      const dateStr = invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString("ru-RU") : "—"
                      if (dateStr && dateStr !== "—") {
                        handleCopy(dateStr, "invoice_date_info")
                      }
                    }}
                    className="group relative w-full bg-violet-500/[0.08] dark:bg-violet-500/[0.14] rounded-xl border border-violet-500/30 px-3 py-2.5 text-left hover:bg-violet-500/[0.14] dark:hover:bg-violet-500/[0.20] hover:border-violet-500/55 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex-1">
                        <p className="text-sm sm:text-base font-bold text-violet-700 dark:text-violet-300">
                          {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString("ru-RU") : "—"}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {copiedField === "invoice_date_info" ? (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-violet-600/70 dark:text-violet-400/70 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Секция с итогами */}
              <div className="bg-card border border-border rounded-2xl p-3.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 px-0.5">Итоги по инвойсу</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Количество товаров */}
                  <div className="bg-sky-500/[0.08] dark:bg-sky-500/[0.13] rounded-xl border border-sky-500/30 px-3.5 py-2.5 hover:border-sky-500/55 transition-all duration-200">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Товаров</p>
                      <span className="text-[11px] font-medium text-sky-600/80 dark:text-sky-400/80">
                        {totals.itemsCount === 1 ? 'товар' : totals.itemsCount < 5 ? 'товара' : 'товаров'}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-sky-700 dark:text-sky-300 tabular-nums mt-0.5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {totals.itemsCount}
                    </p>
                  </div>

                  {/* Количество грузовых мест */}
                  <div className="bg-emerald-500/[0.08] dark:bg-emerald-500/[0.13] rounded-xl border border-emerald-500/30 px-3.5 py-2.5 hover:border-emerald-500/55 transition-all duration-200">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Грузовых мест</p>
                      <span className="text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
                        {totals.totalPlaces === 1 ? 'место' : totals.totalPlaces < 5 ? 'места' : 'мест'}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {formatNumber(totals.totalPlaces)}
                    </p>
                  </div>

                  {/* Общий вес брутто */}
                  <div className="bg-amber-500/[0.08] dark:bg-amber-500/[0.13] rounded-xl border border-amber-500/30 px-3.5 py-2.5 hover:border-amber-500/55 transition-all duration-200">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Вес брутто</p>
                      <span className="text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80">кг</span>
                    </div>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300 tabular-nums break-words mt-0.5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {formatNumber(totals.totalWeight)}
                    </p>
                  </div>

                  {/* Общая сумма */}
                  <div className="bg-primary/[0.08] dark:bg-primary/[0.14] rounded-xl border border-primary/30 px-3.5 py-2.5 hover:border-primary/55 transition-all duration-200">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Общая сумма</p>
                      <span className="text-[11px] font-medium text-primary/80">
                        {invoice.items && invoice.items.length > 0 && invoice.items[0].currency
                          ? invoice.items[0].currency
                          : ''}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-primary tabular-nums break-words mt-0.5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {formatNumber(totals.totalValue)}
                    </p>
                  </div>
                </div>
              </div>

              {/* ВАЖНО: предупреждение, если вес брутто или сумма слишком малы */}
              {
                (() => {
                  const weightErr = new Decimal(totals.totalWeight).lessThan(0.001)
                  const valueErr = new Decimal(totals.totalValue).lessThan(0.01)
                  if (!weightErr && !valueErr) return null
                  return (
                    <div className="mb-7">
                      <div className="rounded-lg border border-yellow-400 dark:border-yellow-500/50 bg-yellow-200 dark:bg-yellow-500/10 flex items-center gap-3 shadow-lg py-3 px-5 text-base font-bold text-yellow-950 dark:text-yellow-200" style={{ fontSize: '1.05rem' }}>
                        <svg xmlns='http://www.w3.org/2000/svg' className="w-7 h-7 text-yellow-600 dark:text-yellow-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19.07a10 10 0 1114.14 0A10 10 0 014.93 19.07z" /></svg>
                        <span>
                          ВНИМАНИЕ:{' '}
                          {weightErr && valueErr && (<><br />- Общий вес брутто &lt; 0,001<br />- Общая сумма &lt; 0,01</>)}
                          {weightErr && !valueErr && <>Общий вес брутто &lt; 0,001</>}
                          {!weightErr && valueErr && <>Общая сумма &lt; 0,01</>}
                          <br />Проверьте корректность данных инвойса.
                        </span>
                      </div>
                    </div>
                  )
                })()
              }

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Товары</h3>
                  {invoice.items && invoice.items.length > 0 && (
                    <button
                      onClick={() => {
                        // Формируем таблицу в формате TSV (табуляция) для Excel
                        const headers = [
                          'Код ТН ВЭД',
                          'Коммерческое описание товара',
                          'Признак товара, свободного от применения запретов и ограничений (всегда 1)',
                          'Информация об упаковке (0-БЕЗ, 1 С)',
                          'Количество грузовых мест',
                          'Вид информации об упаковке (всегда 0)',
                          'Вид упаковки',
                          'Количество упаковок',
                          'Номер контейнера',
                          'Вес брутто',
                          'Валюта',
                          'Сумма'
                        ]
                        // Функция для очистки переносов строк в значениях ячеек
                        const cleanCellValue = (value: string | number | null | undefined): string => {
                          if (value === null || value === undefined) return ''
                          const strValue = String(value)
                          // Заменяем все виды переносов строк на пробелы
                          return strValue.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').trim()
                        }

                        const rows = invoice.items.map((it) => {
                          const packagingInfo = packagingInfos[it.id] !== undefined
                            ? packagingInfos[it.id]
                            : (it.packaging_info !== null && it.packaging_info !== undefined ? it.packaging_info : false)
                          const packagingInfoStr = packagingInfo ? '1' : '0'

                          return [
                            cleanCellValue(it.code),
                            cleanCellValue(it.goods_name),
                            '1',
                            packagingInfoStr,
                            cleanCellValue(formatNumber(it.places)),
                            '0',
                            cleanCellValue(packagingTypes[it.id] || ''),
                            cleanCellValue(formatNumber(it.places)),
                            cleanCellValue(invoice.container_number?.slice(0, 11) || ''),
                            cleanCellValue(formatNumber(it.weight)),
                            cleanCellValue(it.currency),
                            cleanCellValue(formatNumber(it.value_amount))
                          ]
                        })

                        // Копируем только значения без заголовков
                        const tableText = rows.map(row => row.join('\t')).join('\n')

                        handleCopy(tableText, 'table')
                      }}
                      className="group flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg border border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all duration-200 cursor-pointer"
                    >
                      {copiedField === "table" ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300" />
                          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Копировать таблицу</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                  {/* Заголовок таблицы */}
                  <div className={`px-4 py-3 flex items-center gap-2 ${hasZeroValues
                    ? 'bg-red-600 dark:bg-red-900/70 text-white'
                    : 'bg-primary/15 dark:bg-primary/20 text-foreground border-b border-primary/25'
                    }`}>
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-semibold">
                      Данные из Инвойса — <span>{invoice.invoice_number || invoice.container_number || "—"}</span>
                      {hasZeroValues && (
                        <span className="ml-3 text-red-100 dark:text-red-200 font-bold">
                          ⚠️ ВНИМАНИЕ: Есть позиции с нулевыми значениями
                        </span>
                      )}
                    </span>
                  </div>

                  <table className="w-full text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    <thead>
                      <tr className="text-left bg-slate-200/85 dark:bg-zinc-800/90 border-b-2 border-border" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border" style={{ width: '50px' }}></th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border" style={{ width: getColumnWidth('Код ТН ВЭД') }}>Код ТН ВЭД</th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border" style={{ width: getColumnWidth('Коммерческое описание товара') }}>Коммерческое описание товара</th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border whitespace-normal" style={{ width: getColumnWidth('Признак товара, свободного от применения запретов и ограничений (всегда 1)') }}>Признак товара, свободного от применения запретов и ограничений (всегда 1)</th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border whitespace-normal" style={{ width: getColumnWidth('Информация об упаковке (0-БЕЗ, 1 С)') }}>
                          <div className="flex flex-col gap-1.5">
                            <span>Информация об упаковке (0-БЕЗ, 1 С)</span>
                            <select
                              onChange={(e) => handleAllPackagingInfoChange(e.target.value)}
                              value=""
                              className="w-full text-xs border border-input rounded px-2 py-1 bg-background text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                              style={{ fontFamily: 'Montserrat, sans-serif' }}
                            >
                              <option value="">все</option>
                              <option value="0">0</option>
                              <option value="1">1</option>
                            </select>
                          </div>
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border whitespace-normal" style={{ width: getColumnWidth('Количество грузовых мест') }}>Количество грузовых мест</th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border whitespace-normal" style={{ width: getColumnWidth('Вид информации об упаковке (всегда 0)') }}>Вид информации об упаковке (всегда 0)</th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border" style={{ width: getColumnWidth('Вид упаковки') }}>
                          <div className="flex flex-col gap-1.5">
                            <span>Вид упаковки</span>
                            <select
                              onChange={(e) => handleAllPackagingTypeChange(e.target.value)}
                              value=""
                              className="w-full text-xs border border-input rounded px-2 py-1 bg-background text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                              style={{ fontFamily: 'Montserrat, sans-serif' }}
                            >
                              <option value="">все</option>
                              <option value="PK">PK</option>
                              <option value="CS">CS</option>
                              <option value="CT">CT</option>
                              <option value="FR">FR</option>
                              <option value="NG">NG</option>
                              <option value="PP">PP</option>
                              <option value="BG">BG</option>
                              <option value="BX">BX</option>
                              <option value="NF">NF</option>
                              <option value="PX">PX</option>
                            </select>
                          </div>
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border whitespace-normal" style={{ width: getColumnWidth('Количество упаковок') }}>Количество упаковок</th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border whitespace-normal" style={{ width: getColumnWidth('Номер контейнера') }}>Номер контейнера</th>
                        {/* Одинаковая ширина для колонок \"Вес брутто\" и \"Сумма\" */}
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border" style={{ width: '120px' }}>Вес брутто</th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs border-r border-border" style={{ width: getColumnWidth('Валюта') }}>
                          <div className="flex flex-col gap-1.5">
                            <span>Валюта</span>
                            <select
                              onChange={(e) => handleAllCurrencyChange(e.target.value)}
                              value=""
                              className="w-full text-xs border border-input rounded px-2 py-1 bg-background text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                              style={{ fontFamily: 'Montserrat, sans-serif' }}
                            >
                              <option value="">все</option>
                              <option value="CNY">CNY</option>
                              <option value="USD">USD</option>
                              <option value="RUB">RUB</option>
                              <option value="EUR">EUR</option>
                              <option value="JPY">JPY</option>
                            </select>
                          </div>
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-foreground text-xs" style={{ width: '120px' }}>Сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border ">
                      {(invoice.items || []).map((it, index) => {
                        const weightErr = it.weight && new Decimal(it.weight).lessThan(0.001)
                        const valueErr = it.value_amount && new Decimal(it.value_amount).lessThan(0.01)
                        const anyErr = weightErr || valueErr;
                        return (
                          <tr
                            key={it.id}
                            className={`transition-colors ${anyErr
                              ? 'bg-red-50 dark:bg-red-500/10 border-l-4 border-red-400 dark:border-red-500/50'
                              : (index % 2 === 0 ? 'bg-card' : 'bg-muted/30')
                              } ${anyErr ? 'hover:bg-red-100 dark:hover:bg-red-500/20' : 'hover:bg-primary/5'}`}
                          >
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-center" style={{ width: '50px' }}>
                              <button
                                onClick={() => handleEditItem(it)}
                                className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40 flex items-center justify-center transition-all duration-200 hover:shadow-md group"
                                title="Редактировать товар"
                              >
                                <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300" />
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-xs tabular-nums font-medium" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Код ТН ВЭД') }}>{it.code || ""}</td>
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Коммерческое описание товара') }}>{it.goods_name || ""}</td>
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-xs text-center tabular-nums font-medium" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Признак товара, свободного от применения запретов и ограничений (всегда 1)') }}>1</td>
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-xs text-center" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Информация об упаковке (0-БЕЗ, 1 С)') }}>
                              <select
                                value={packagingInfos[it.id] !== undefined
                                  ? (packagingInfos[it.id] ? "1" : "0")
                                  : (it.packaging_info !== null && it.packaging_info !== undefined ? (it.packaging_info ? "1" : "0") : "0")}
                                onChange={(e) => handlePackagingInfoChange(it.id, e.target.value)}
                                className="w-full text-xs border border-input rounded px-2 py-1 bg-background text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors tabular-nums font-medium"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                              >
                                <option value="0">0</option>
                                <option value="1">1</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-xs text-center tabular-nums font-medium" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Количество грузовых мест') }}>{formatNumber(it.places)}</td>
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-xs text-center tabular-nums font-medium" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Вид информации об упаковке (всегда 0)') }}>0</td>
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-xs" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Вид упаковки') }}>
                              <select
                                value={packagingTypes[it.id] !== undefined ? packagingTypes[it.id] : (it.packaging_type || "PK")}
                                onChange={(e) => handlePackagingTypeChange(it.id, e.target.value)}
                                className="w-full text-xs border border-input rounded px-2 py-1 bg-background text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-medium"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                              >
                                <option value="PK">PK</option>
                                <option value="CS">CS</option>
                                <option value="CT">CT</option>
                                <option value="FR">FR</option>
                                <option value="NG">NG</option>
                                <option value="PP">PP</option>
                                <option value="BG">BG</option>
                                <option value="BX">BX</option>
                                <option value="NF">NF</option>
                                <option value="PX">PX</option>
                                {/* Динамически добавляем все уникальные значения из БД, которых нет в стандартном списке */}
                                {allPackagingTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                                {/* Также добавляем текущее значение товара, если его еще нет в списке */}
                                {it.packaging_type &&
                                  !['PK', 'CS', 'CT', 'FR', 'NG', 'PP', 'BG', 'BX', 'NF', 'PX'].includes(it.packaging_type) &&
                                  !allPackagingTypes.includes(it.packaging_type) && (
                                    <option value={it.packaging_type}>{it.packaging_type}</option>
                                  )}
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-xs text-center tabular-nums font-medium" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Количество упаковок') }}>{formatNumber(it.places)}</td>
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-xs tabular-nums font-medium" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Номер контейнера') }}>{invoice.container_number?.slice(0, 11) || ""}</td>
                            <td className={`py-2.5 px-3 border-r border-border text-xs tabular-nums font-medium ${weightErr ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/20' : 'text-foreground'}`} style={{ fontFamily: 'Montserrat, sans-serif', width: '120px' }}>
                              {formatNumber(it.weight)}
                              {weightErr && (
                                <span className="ml-2 inline-flex items-center text-xs font-semibold">
                                  ⚠️
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-foreground border-r border-border text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Валюта') }}>{it.currency || ""}</td>
                            <td className={`py-2.5 px-3 text-xs border-r border-border tabular-nums font-medium ${valueErr ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/20' : 'text-foreground'}`} style={{ fontFamily: 'Montserrat, sans-serif', width: '120px' }}>
                              {formatNumber(it.value_amount)}
                              {valueErr && (
                                <span className="ml-2 inline-flex items-center text-xs font-semibold">
                                  ⚠️
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {/* Строка итогов */}
                      {invoice.items && invoice.items.length > 0 && (
                        <tr className="bg-primary/10 border-t border-border font-semibold">
                          <td className="py-3 px-3 border-r border-border text-center" style={{ width: '50px' }}></td>
                          <td className="py-3 px-3 border-r border-border text-xs" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Код ТН ВЭД') }}></td>
                          <td className="py-3 px-3 border-r border-border text-sm font-bold text-foreground" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.01em', width: getColumnWidth('Коммерческое описание товара') }}>
                            ИТОГО: {totals.itemsCount} {totals.itemsCount === 1 ? 'товар' : totals.itemsCount < 5 ? 'товара' : 'товаров'}
                          </td>
                          <td className="py-3 px-3 border-r border-border text-xs text-center" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Признак товара, свободного от применения запретов и ограничений (всегда 1)') }}></td>
                          <td className="py-3 px-3 border-r border-border text-xs text-center" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Информация об упаковке (0-БЕЗ, 1 С)') }}></td>
                          <td className="py-3 px-3 border-r border-border text-sm text-center font-bold text-foreground tabular-nums" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Количество грузовых мест') }}>
                            {formatNumber(totals.totalPlaces)}
                          </td>
                          <td className="py-3 px-3 border-r border-border text-xs text-center" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Вид информации об упаковке (всегда 0)') }}></td>
                          <td className="py-3 px-3 border-r border-border text-xs" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Вид упаковки') }}></td>
                          <td className="py-3 px-3 border-r border-border text-xs text-center" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Количество упаковок') }}></td>
                          <td className="py-3 px-3 border-r border-border text-xs" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Номер контейнера') }}></td>
                          <td className="py-3 px-3 border-r border-border text-sm font-bold text-foreground tabular-nums" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Вес брутто') }}>
                            {formatNumber(totals.totalWeight)}
                          </td>
                          <td className="py-3 px-3 border-r border-border text-xs" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Валюта') }}></td>
                          <td className="py-3 px-3 text-sm font-bold text-foreground tabular-nums" style={{ fontFamily: 'Montserrat, sans-serif', width: getColumnWidth('Сумма') }}>
                            {formatNumber(totals.totalValue)}
                          </td>
                        </tr>
                      )}
                      {(!invoice.items || invoice.items.length === 0) && (
                        <tr>
                          <td colSpan={13} className="py-12 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Package className="w-8 h-8 text-muted-foreground/50" />
                              <span className="text-sm">Нет товаров</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">Данные не найдены</div>
          )}
        </div>
      </div>

      {/* Модальное окно редактирования товара */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl transition-colors">
          <DialogHeader className="pb-4 border-b border-indigo-200/50 dark:border-indigo-500/20">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Pencil className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Редактирование товара
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-xs font-semibold text-muted-foreground">Код ТН ВЭД</Label>
                <Input
                  id="code"
                  value={editFormData.code}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Введите код ТН ВЭД"
                  className="bg-background border-indigo-200 dark:border-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400/20 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-xs font-semibold text-muted-foreground">Валюта</Label>
                <Input
                  id="currency"
                  value={editFormData.currency}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, currency: e.target.value }))}
                  placeholder="Введите валюту"
                  className="bg-background border-indigo-200 dark:border-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400/20 dark:text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goods_name" className="text-xs font-semibold text-muted-foreground">Коммерческое описание товара</Label>
              <Textarea
                id="goods_name"
                value={editFormData.goods_name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, goods_name: e.target.value }))}
                placeholder="Введите описание товара"
                className="min-h-24 bg-background border-indigo-200 dark:border-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400/20 dark:text-white resize-y"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="places" className="text-xs font-semibold text-muted-foreground">Количество грузовых мест</Label>
                <Input
                  id="places"
                  type="number"
                  value={editFormData.places}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, places: e.target.value }))}
                  placeholder="Введите количество"
                  className="bg-background border-indigo-200 dark:border-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400/20 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-xs font-semibold text-muted-foreground">Вес брутто</Label>
                <Input
                  id="weight"
                  value={editFormData.weight}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="Введите вес"
                  className="bg-background border-indigo-200 dark:border-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400/20 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value_amount" className="text-xs font-semibold text-muted-foreground">Сумма</Label>
                <Input
                  id="value_amount"
                  value={editFormData.value_amount}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, value_amount: e.target.value }))}
                  placeholder="Введите сумму"
                  className="bg-background border-indigo-200 dark:border-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400/20 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="packaging_type" className="text-xs font-semibold text-muted-foreground">Вид упаковки</Label>
                <select
                  id="packaging_type"
                  value={editFormData.packaging_type}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, packaging_type: e.target.value }))}
                  className="w-full h-10 rounded-md border border-indigo-200 dark:border-indigo-500/30 bg-background px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/20 dark:text-white hover:border-indigo-300 dark:hover:border-indigo-500/50"
                >
                  <option value="PK">PK</option>
                  <option value="CS">CS</option>
                  <option value="CT">CT</option>
                  <option value="FR">FR</option>
                  <option value="NG">NG</option>
                  <option value="PP">PP</option>
                  <option value="BG">BG</option>
                  <option value="BX">BX</option>
                  <option value="NF">NF</option>
                  <option value="PX">PX</option>
                  {allPackagingTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="packaging_info" className="text-xs font-semibold text-muted-foreground">Информация об упаковке</Label>
              <select
                id="packaging_info"
                value={editFormData.packaging_info}
                onChange={(e) => setEditFormData(prev => ({ ...prev, packaging_info: e.target.value }))}
                className="w-full h-10 rounded-md border border-indigo-200 dark:border-indigo-500/30 bg-background px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/20 dark:text-white hover:border-indigo-300 dark:hover:border-indigo-500/50"
              >
                <option value="0">0 - БЕЗ</option>
                <option value="1">1 - С</option>
              </select>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-indigo-200/50 dark:border-indigo-500/20 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false)
                setEditingItem(null)
              }}
              className="rounded-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleSaveItem}
              className="rounded-full bg-primary text-primary-foreground hover:opacity-90 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all"
            >
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default InvoicePage
