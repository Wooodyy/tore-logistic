"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTheme } from "next-themes"
import { 
  FileText, ArrowLeft, Package, 
  FileCheck, Receipt, AlertTriangle,
  Sun, Moon,
  Train,
  ChevronDown, FileCode
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Decimal from "decimal.js"


interface ContainerValidation {
  [containerNumber: string]: {
    found: boolean
    data?: {
      containers: any[]
    }
  }
}

export default function XmlViewPage() {
  const router = useRouter()
  const params = useParams()
  const filename = params?.filename as string
  const [fileContent, setFileContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [decodedFilename, setDecodedFilename] = useState<string>("")
  const [containerValidations, setContainerValidations] = useState<ContainerValidation>({})
  const [selectedDbContainerIds, setSelectedDbContainerIds] = useState<Record<string, number | null>>({})
  const [goodsCollapsed, setGoodsCollapsed] = useState(false)
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const toggleBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setMounted(true), [])

 
  // If DB returned multiple containers for the same number, allow picking which one to compare with.
  useEffect(() => {
    setSelectedDbContainerIds(prev => {
      const next = { ...prev }
      for (const [containerNumber, validation] of Object.entries(containerValidations)) {
        if (!validation?.found || !validation.data) continue
        const containers = validation.data.containers
        if (!Array.isArray(containers) || containers.length === 0) continue
        const current = next[containerNumber]
        const stillExists =
          typeof current === 'number'
            ? containers.some((c: any) => Number(c?.id) === current)
            : false
        if (stillExists) continue
        // If duplicates exist, require explicit user choice (no auto-pick).
        if (containers.length > 1) {
          next[containerNumber] = null
          continue
        }
        // Exactly one match — select it automatically.
        next[containerNumber] = Number(containers[0]?.id) || null
      }
      return next
    })
  }, [containerValidations])

  const handleBack = useCallback(() => {
    router.push('/')
  }, [router])

  const formatNumber = useCallback((value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') {
      return ''
    }
    
    try {
      const strValue = typeof value === 'string' ? value.trim().replace(',', '.') : String(value)
      const decimal = new Decimal(strValue)
      // Не округляем и не обрезаем дробную часть: показываем исходную точность числа.
      return decimal.toString().replace('.', ',')
    } catch (error) {
      return ''
    }
  }, [])

  const normalizePackagingInfo = useCallback((value: any): string => {
    if (value === null || value === undefined || value === '') return '0'
    if (typeof value === 'boolean') return value ? '1' : '0'
    if (value === 1 || value === '1') return '1'
    if (value === 0 || value === '0') return '0'
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'true') return '1'
    if (normalized === 'false') return '0'
    return normalized
  }, [])

  

    dbContainerData.items.forEach((item: any) => {
      if (item.places) {
        totalPlaces = totalPlaces.plus(new Decimal(item.places))
      }
      if (item.weight) {
        totalWeight = totalWeight.plus(new Decimal(item.weight))
      }
      if (item.value_amount) {
        totalValue = totalValue.plus(new Decimal(item.value_amount))
      }
    })

    return {
      totalPlaces: totalPlaces.toString(),
      totalWeight: totalWeight.toString(),
      totalValue: totalValue.toString()
    }
  }, [dbContainerData])

  const xmlTotals = useMemo(() => {
    if (!parsedData.goodsItems || parsedData.goodsItems.length === 0) {
      return { totalPlaces: null, totalPackageQuantity: null, totalWeight: null, totalValue: null }
    }

    let totalPlaces = new Decimal(0)
    let totalPackageQuantity = new Decimal(0)
    let totalWeight = new Decimal(0)
    let totalValue = new Decimal(0)

    parsedData.goodsItems.forEach((item) => {
      try {
        if (item.cargoPlaces !== undefined && item.cargoPlaces !== null && item.cargoPlaces !== '') {
          totalPlaces = totalPlaces.plus(new Decimal(String(item.cargoPlaces).replace(',', '.')))
        }
      } catch (e) { /* ignore */ }

      try {
        if (item.packageQuantity !== undefined && item.packageQuantity !== null && item.packageQuantity !== '') {
          totalPackageQuantity = totalPackageQuantity.plus(new Decimal(String(item.packageQuantity).replace(',', '.')))
        }
      } catch (e) { /* ignore */ }

      try {
        if (item.grossMass !== undefined && item.grossMass !== null && item.grossMass !== '') {
          totalWeight = totalWeight.plus(new Decimal(String(item.grossMass).replace(',', '.')))
        }
      } catch (e) { /* ignore */ }

      try {
        if (item.value !== undefined && item.value !== null && item.value !== '') {
          totalValue = totalValue.plus(new Decimal(String(item.value).replace(',', '.')))
        }
      } catch (e) { /* ignore */ }
    })

    return {
      totalPlaces: totalPlaces.toString(),
      totalPackageQuantity: totalPackageQuantity.toString(),
      totalWeight: totalWeight.toString(),
      totalValue: totalValue.toString(),
    }
  }, [parsedData.goodsItems])

  const convertDateFormat = useCallback((dateStr: string | undefined): string => {
    if (!dateStr) return ''
    
    if (dateStr.includes('T') || dateStr.includes('Z')) {
      try {
        const date = new Date(dateStr)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}.${month}.${year}`
      } catch (e) {
        console.error('Error parsing ISO date:', e)
        return dateStr
      }
    }
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-')
      return `${day}.${month}.${year}`
    }
    
    return dateStr
  }, [])

  const uniqueDocuments = useMemo(() => {
    if (!parsedData.goodsItems) return []
    
    const docMap = new Map<string, { 
      code?: string; 
      id?: string; 
      date?: string;
      name?: string; 
      isValid?: boolean | undefined;
      numberMatch?: boolean;
      dateMatch?: boolean;
    }>()
    
    parsedData.goodsItems.forEach(item => {
      item.documents?.forEach(doc => {
        const key = `${doc.code || ''}_${doc.id || ''}_${doc.date || ''}`
        if (!docMap.has(key) && (doc.id || doc.code)) {
          let isValid: boolean | undefined = undefined
          let numberMatch: boolean | undefined = undefined
          let dateMatch: boolean | undefined = undefined
          
          if (dbContainerData) {
            if (doc.code === '04131' || doc.code === '04021') {
              numberMatch = dbContainerData.invoice_number === doc.id
              
              const xmlDateConverted = convertDateFormat(doc.date)
              const dbDate = dbContainerData.invoice_date || ''
              dateMatch = !doc.date || xmlDateConverted === dbDate
              
              isValid = numberMatch && dateMatch
            }
          }
          docMap.set(key, { ...doc, isValid, numberMatch, dateMatch })
        }
      })
    })
    
    return Array.from(docMap.values())
  }, [parsedData.goodsItems, dbContainerData, convertDateFormat])

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

  const totalWeight = useMemo(() => {
    if (!parsedData.goodsItems) return '0'
    let total = new Decimal(0)
    parsedData.goodsItems.forEach(item => {
      if (item.grossMass) {
        try {
          const val = typeof item.grossMass === 'string' ? item.grossMass.replace(',', '.') : String(item.grossMass)
          total = total.plus(new Decimal(val))
        } catch (e) { /* ignore */ }
      }
    })
    return formatNumber(total.toString())
  }, [parsedData.goodsItems, formatNumber])

  const overviewData = useMemo(() => {
    const xmlGoodsCount = parsedData.goodsQuantity || '0'
    const dbItemsCount = dbContainerData?.items?.length || 0
    const goodsMatch = dbContainerData ? String(dbItemsCount) === xmlGoodsCount : null
    
    const xmlPlaces = parsedData.cargoQuantity || '0'
    const dbPlaces = dbTotals.totalPlaces
    const placesMatch = dbPlaces ? new Decimal(dbPlaces).equals(new Decimal(xmlPlaces)) : null
    
    const xmlAmount = parsedData.totalAmount || '0'
    const dbValue = dbTotals.totalValue
    const valueMatch = dbValue ? new Decimal(dbValue).minus(new Decimal(xmlAmount.replace(',', '.'))).abs().lessThan(0.01) : null
    
    const weightMatch = dbTotals.totalWeight ? new Decimal(dbTotals.totalWeight).minus(totalWeight.replace(',', '.')).abs().lessThan(0.1) : null
    
    return {
      xmlGoodsCount,
      dbItemsCount,
      goodsMatch,
      xmlPlaces,
      dbPlaces,
      placesMatch,
      xmlAmount,
      dbValue,
      valueMatch,
      weightMatch
    }
  }, [parsedData.goodsQuantity, parsedData.cargoQuantity, parsedData.totalAmount, dbContainerData, dbTotals, totalWeight])

  const containerConsistency = useMemo(() => {
    const transportId = (parsedData.transportMeansRegId || '').trim()
    const itemIdsRaw = (parsedData.goodsItems || [])
      .map((it: any) => String(it?.containerId ?? '').trim())
      .filter(Boolean)

    const uniqueItemIds = Array.from(new Set(itemIdsRaw))

    const hasItems = (parsedData.goodsItems?.length || 0) > 0
    const hasAnyContainerInItems = uniqueItemIds.length > 0
    const allItemsHaveSameContainerId = uniqueItemIds.length <= 1

    const differsBetweenItems = hasAnyContainerInItems && uniqueItemIds.length > 1
    const differsFromTransportMeans =
      Boolean(transportId) &&
      hasAnyContainerInItems &&
      uniqueItemIds.some((id) => id !== transportId)

    const isOk =
      (hasItems ? !differsBetweenItems : true) &&
      (transportId ? !differsFromTransportMeans : true)

    return {
      transportId,
      hasItems,
      uniqueItemIds,
      allItemsHaveSameContainerId,
      differsBetweenItems,
      differsFromTransportMeans,
      isOk,
    }
  }, [parsedData.transportMeansRegId, parsedData.goodsItems])

  const packageQuantityMatch = useMemo(() => {
    if (!dbTotals.totalPlaces || !xmlTotals.totalPackageQuantity) return null
    try {
      return new Decimal(dbTotals.totalPlaces).equals(new Decimal(xmlTotals.totalPackageQuantity))
    } catch {
      return null
    }
  }, [dbTotals.totalPlaces, xmlTotals.totalPackageQuantity])

  const getTotalMatchClass = useCallback((match: boolean | null) => {
    return match === true
      ? 'bg-emerald-200/90 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-100 border-none'
      : match === false
      ? 'bg-rose-200/90 text-rose-950 dark:bg-rose-500/25 dark:text-rose-100 border-none'
      : 'bg-slate-200/70 text-slate-950 dark:bg-white/[0.06] dark:text-zinc-100 border border-slate-300/60 dark:border-white/[0.10]'
  }, [])

  const getContainerValidation = useCallback((containerId: string | undefined) => {
    if (!containerId) return null
    return containerValidations[containerId]
  }, [containerValidations])

  // Patch: helper to determine container match for "Номер контейнера" field
  const getContainerMatchClass = useCallback(
    (containerId: string | undefined, hasDbItem: boolean) => {
      if (!containerId) return 'text-slate-900 dark:text-zinc-100'
      const validation = getContainerValidation(containerId)
      if (!hasDbItem) {
        // Highlight only if not found in base (red)
        return validation && validation.found === false
          ? 'bg-red-100 text-red-900'
          : 'text-slate-900 dark:text-zinc-100'
      }
      // When comparing with a matching database record, color green/red based on found
      if (validation?.found) {
        return 'bg-green-100 text-green-900 dark:bg-emerald-500/15 dark:text-emerald-200'
      } else if (validation?.found === false) {
        return 'bg-red-100 text-red-900 dark:bg-rose-500/15 dark:text-rose-200'
      }
      return 'text-slate-900 dark:text-zinc-100'
    },
    [getContainerValidation]
  )

  const sortedXmlGoodsItems = useMemo(() => {
    const items = parsedData.goodsItems ? [...parsedData.goodsItems] : []
    items.sort((a, b) => {
      const w = compareDecimalsAscNullLast(parseDecimalSafe(a.grossMass), parseDecimalSafe(b.grossMass))
      if (w !== 0) return w
      const s = compareDecimalsAscNullLast(parseDecimalSafe(a.value), parseDecimalSafe(b.value))
      if (s !== 0) return s
      const d = compareStringsAsc(a.description, b.description)
      if (d !== 0) return d
      return compareStringsAsc(a.commodityCode, b.commodityCode)
    })
    return items
  }, [parsedData.goodsItems, compareDecimalsAscNullLast, parseDecimalSafe, compareStringsAsc])

  const primaryContainerId = useMemo(() => {
    return parsedData.transportMeansRegId || sortedXmlGoodsItems[0]?.containerId || undefined
  }, [parsedData.transportMeansRegId, sortedXmlGoodsItems])

  const getSelectedDbContainerForNumber = useCallback((containerNumber: string | undefined) => {
    if (!containerNumber) return null
    const validation = containerValidations[containerNumber]
    const containers = validation?.data?.containers
    if (!validation?.found || !Array.isArray(containers) || containers.length === 0) return null
    const selectedId = selectedDbContainerIds[containerNumber]
    if (typeof selectedId === 'number') {
      const found = containers.find((c: any) => Number(c?.id) === selectedId)
      if (found) return found
    }
    // If there are multiple options and nothing selected yet — don't guess.
    if (containers.length > 1) return null
    return containers[0] || null
  }, [containerValidations, selectedDbContainerIds])

  const sortedDbItemsByContainer = useMemo(() => {
    const result: Record<string, any[]> = {}
    Object.entries(containerValidations).forEach(([containerNumber, validation]) => {
      if (!validation?.found) return
      const containers = validation?.data?.containers
      if (!Array.isArray(containers) || containers.length === 0) return
      const selectedId = selectedDbContainerIds[containerNumber]
      const selectedContainer =
        typeof selectedId === 'number'
          ? containers.find((c: any) => Number(c?.id) === selectedId)
          : (containers.length === 1 ? containers[0] : null)
      const items = selectedContainer?.items
      if (!Array.isArray(items)) return
      const sorted = [...items].sort((a: any, b: any) => {
        const w = compareDecimalsAscNullLast(parseDecimalSafe(a.weight), parseDecimalSafe(b.weight))
        if (w !== 0) return w
        const s = compareDecimalsAscNullLast(parseDecimalSafe(a.value_amount), parseDecimalSafe(b.value_amount))
        if (s !== 0) return s
        const d = compareStringsAsc(a.goods_name, b.goods_name)
        if (d !== 0) return d
        return compareStringsAsc(a.code, b.code)
      })
      result[containerNumber] = sorted
    })
    return result
  }, [containerValidations, selectedDbContainerIds, compareDecimalsAscNullLast, parseDecimalSafe, compareStringsAsc])

  const sortedDbItemsCurrentContainer = useMemo(() => {
    const containerKey = primaryContainerId
    if (!containerKey) return []
    const fromValidations = sortedDbItemsByContainer[containerKey]
    if (fromValidations) return fromValidations
    // Если данные БД ещё не пришли, но ключ уже известен из XML — возвращаем пусто,
    // иначе будет попытка прочитать items у null.
    const selectedContainer = getSelectedDbContainerForNumber(containerKey)
    if (!selectedContainer) return []
    const raw = Array.isArray(selectedContainer.items) ? [...selectedContainer.items] : []
    raw.sort((a: any, b: any) => {
      const w = compareDecimalsAscNullLast(parseDecimalSafe(a.weight), parseDecimalSafe(b.weight))
      if (w !== 0) return w
      const s = compareDecimalsAscNullLast(parseDecimalSafe(a.value_amount), parseDecimalSafe(b.value_amount))
      if (s !== 0) return s
      const d = compareStringsAsc(a.goods_name, b.goods_name)
      if (d !== 0) return d
      return compareStringsAsc(a.code, b.code)
    })
    return raw
  }, [
    primaryContainerId,
    sortedDbItemsByContainer,
    getSelectedDbContainerForNumber,
    compareDecimalsAscNullLast,
    parseDecimalSafe,
    compareStringsAsc,
  ])

  const compareItemWithDB = useCallback((item: any, containerId: string | undefined, itemIndex: number) => {
    if (!containerId) return { isValid: false, hasData: false }
    
    const validation = containerValidations[containerId]
    if (!validation || !validation.found || !validation.data) {
      return { isValid: false, hasData: false }
    }

    const selectedContainer = getSelectedDbContainerForNumber(containerId)
    const dbData = selectedContainer
    const dbItems = sortedDbItemsByContainer[containerId] || selectedContainer?.items || []
    
    if (dbItems.length === 0) {
      return { isValid: true, hasData: true, dbData, fieldMatches: {}, matchingDbItem: null }
    }

    const matchingDbItem = dbItems[itemIndex] || null
    
    if (!matchingDbItem) {
      return { isValid: true, hasData: false, dbData, fieldMatches: {}, matchingDbItem: null }
    }

    const compareNumbers = (val1: any, val2: any, tolerance = 0.01) => {
      if (val1 === null || val1 === undefined || val1 === '') return val2 === null || val2 === undefined || val2 === ''
      if (val2 === null || val2 === undefined || val2 === '') return false
      
      const num1 = typeof val1 === 'string' ? parseFloat(val1.replace(',', '.')) : parseFloat(val1)
      const num2 = typeof val2 === 'string' ? parseFloat(val2.replace(',', '.')) : parseFloat(val2)
      
      if (isNaN(num1) || isNaN(num2)) return false
      return Math.abs(num1 - num2) <= tolerance
    }

    const normalizeContainerId = (v: any) => String(v ?? '').trim().toUpperCase()

    const fieldMatches: any = {}
    
    if (matchingDbItem) {
      const dbCode = (matchingDbItem.code || '').substring(0, 6)
      const xmlCode = (item.commodityCode || '').substring(0, 6)
      fieldMatches.commodityCode = dbCode === xmlCode && dbCode !== ''
      
      const normalizeTextForWords = (v: any) =>
        String(v ?? '')
          .replace(/\u00A0/g, ' ')
          .trim()
          .toUpperCase()
          .replace(/Ё/g, 'Е')
          // allow 2,5 == 2.5 in word matching
          .replace(/,/g, '.')

      const splitToWords = (v: any) => {
        const norm = normalizeTextForWords(v)
        if (!norm) return []
        // tokens:
        // - decimals: 2.5
        // - alnum words (Cyrillic + Latin + digits) with optional inner '-' (e.g. "ДПК-Х", "A-123")
        const tokens = norm.match(/[0-9]+(?:\.[0-9]+)?|[0-9A-ZА-Я]+(?:-[0-9A-ZА-Я]+)*/g)
        return tokens ? tokens.filter(Boolean) : []
      }

      const tdWords = splitToWords(item.description)
      const siteWordsSet = new Set(splitToWords(matchingDbItem.goods_name))

      // Rule: all words from TD must be present in site name (case-insensitive)
      fieldMatches.description =
        tdWords.length > 0 ? tdWords.every(w => siteWordsSet.has(w)) : normalizeTextForWords(matchingDbItem.goods_name) === ''
      
      fieldMatches.cargoPlaces = compareNumbers(item.cargoPlaces, matchingDbItem.places)
      fieldMatches.packageCode = matchingDbItem.package_type === item.packageCode
      fieldMatches.grossMass = compareNumbers(item.grossMass, matchingDbItem.weight, 0.1)
      fieldMatches.valueCurrency = matchingDbItem.currency === item.valueCurrency
      fieldMatches.value = compareNumbers(item.value, matchingDbItem.value_amount, 0.01)
      const dbPackagingInfo = normalizePackagingInfo(
        matchingDbItem.packaging_info ?? matchingDbItem.package_info
      )
      fieldMatches.packagingInfo = dbPackagingInfo === String(item.packagingInfo || '0')
      fieldMatches.packageQuantity = compareNumbers(item.packageQuantity, matchingDbItem.places)
      // Compare container id in XML item with selected/validated container id
      const xmlContainer = normalizeContainerId(item.containerId)
      const expectedContainer = normalizeContainerId(containerId)
      fieldMatches.containerId = xmlContainer !== '' && expectedContainer !== '' && xmlContainer === expectedContainer
    }

    fieldMatches.restrictionsFree = (item.restrictionsFree === '1' || item.restrictionsFree === 1)
    fieldMatches.packagingInfoType = (item.packagingInfoType === '0' || item.packagingInfoType === 0)

    return { isValid: true, hasData: true, dbData, fieldMatches, matchingDbItem }
  }, [containerValidations, getSelectedDbContainerForNumber, normalizePackagingInfo, sortedDbItemsByContainer])

  const goodsValidationStats = useMemo(() => {
    if (!sortedXmlGoodsItems || sortedXmlGoodsItems.length === 0) {
      return { total: 0, matched: 0, percent: 0 }
    }

    let matched = 0
    let total = 0

    sortedXmlGoodsItems.forEach((item, idx) => {
      const cmp = compareItemWithDB(item as any, primaryContainerId, idx)
      if (cmp.hasData && cmp.fieldMatches) {
        Object.values(cmp.fieldMatches).forEach(val => {
          total += 1
          if (val) matched += 1
        })
      }
    })

    const percent = total > 0 ? Math.round((matched / total) * 100) : 0
    return { total, matched, percent }
  }, [sortedXmlGoodsItems, compareItemWithDB, primaryContainerId])

  const missingContainers = useMemo(() => {
    const missing = new Set<string>()

    if (parsedData.transportMeansRegId) {
      const validation = containerValidations[parsedData.transportMeansRegId]
      if (validation && validation.found === false) missing.add(parsedData.transportMeansRegId)
      return Array.from(missing)
    }

    if (!parsedData.goodsItems || parsedData.goodsItems.length === 0) return []

    parsedData.goodsItems.forEach((item) => {
      const id = item.containerId
      if (!id) return
      const validation = containerValidations[id]
      if (validation && validation.found === false) {
        missing.add(id)
      }
    })

    return Array.from(missing)
  }, [parsedData.transportMeansRegId, parsedData.goodsItems, containerValidations])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!decodedFilename || !fileContent) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-zinc-950 dark:via-neutral-950 dark:to-zinc-900 transition-colors duration-300">
        <header className="border-b border-slate-200 dark:border-white/[0.06] rounded-2xl bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  ТД Файл
                </h1>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5 font-medium">
                  Просмотр транзитной декларации
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-lg p-8 transition-colors">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCode className="w-20 h-20 text-slate-400 dark:text-zinc-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Файл не найден</h2>
              <p className="text-slate-600 dark:text-zinc-400 mb-6">XML файл не был загружен или данные были удалены</p>
              <Button onClick={handleBack} className="bg-indigo-600 hover:bg-indigo-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Вернуться назад
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-zinc-950 dark:via-neutral-950 dark:to-zinc-900 transition-colors duration-300">
      <header className="border-b border-slate-200 dark:border-white/[0.06] rounded-2xl bg-white/95 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
        <div className="w-full px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Транзитная Декларация
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5 font-medium">
                {decodedFilename}
              </p>
            </div>
            </div>

            {mounted && (
              <button
                ref={toggleBtnRef}
                onClick={handleThemeToggle}
                aria-label="Переключить тему"
                className="
                  w-10 h-10 rounded-xl
                  flex items-center justify-center
                  text-slate-500 dark:text-zinc-400
                  hover:text-slate-700 dark:hover:text-zinc-200
                  hover:bg-slate-100 dark:hover:bg-white/[0.07]
                  active:scale-90
                  transition-all duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950
                "
              >
                {isDark
                  ? <Sun className="w-[20px] h-[20px]" strokeWidth={2} />
                  : <Moon className="w-[20px] h-[20px]" strokeWidth={2} />
                }
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="w-full px-6 py-6 space-y-6">
        {missingContainers.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 via-amber-50 to-red-50 dark:from-rose-500/10 dark:via-amber-500/10 dark:to-rose-500/10 border border-red-200/80 dark:border-rose-500/20 rounded-2xl shadow-md px-5 py-4 flex gap-3 items-start transition-colors">
            <div className="mt-0.5">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-900 dark:text-rose-200">
                Контейнер{missingContainers.length > 1 ? "ы" : ""} не найдены в базе. Автоматическая проверка по этим контейнерам не была выполнена.
              </p>
              <p className="text-xs text-red-800 dark:text-rose-200/80">
                Номера контейнеров:{" "}
                <span className="font-mono font-semibold">
                  {missingContainers.join(", ")}
                </span>
              </p>
            </div>
          </div>
        )}

        {xmlContainerKey && dbContainerVariants.length > 1 && (
          <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-lg transition-colors overflow-hidden">
            <div className="border-b border-slate-200 dark:border-white/[0.08] px-4 py-3 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-500/10 dark:to-indigo-500/5 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    Найдено несколько контейнеров с номером {xmlContainerKey}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                    Выберите, с каким контейнером сравнивать XML
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/15 rounded text-xs font-semibold text-indigo-700 dark:text-indigo-200 transition-colors shrink-0">
                  {dbContainerVariants.length}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-3">
                {dbContainerVariants.map((c: any) => {
                  const id = Number(c?.id)
                  const isSelected = selectedDbContainerIds[xmlContainerKey] === id
                  return (
                    <button
                      key={String(c?.id ?? id)}
                      type="button"
                      onClick={() =>
                        setSelectedDbContainerIds(prev => ({
                          ...prev,
                          [xmlContainerKey]: Number.isFinite(id) ? id : null,
                        }))
                      }
                      className={`
                        relative w-full text-left px-5 py-4 md:px-6 md:py-5 rounded-3xl
                        bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50
                        dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900
                        border ${isSelected ? 'border-emerald-300 dark:border-emerald-500/40' : 'border-slate-200 dark:border-white/[0.07]'}
                        shadow-sm hover:shadow-md dark:shadow-black/50 dark:hover:shadow-black/70
                        hover:border-indigo-300 dark:hover:border-white/[0.13]
                        hover:-translate-y-px active:translate-y-0
                        transition-all duration-200 cursor-pointer group
                      `}
                      aria-pressed={isSelected}
                    >
                      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-indigo-500/5 via-transparent to-emerald-500/5 dark:from-white/[0.03] dark:to-white/[0.01] pointer-events-none" />

                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-zinc-600 font-semibold">
                            ID инвойса в базе
                          </div>
                          <div className="mt-1 font-bold text-base md:text-lg text-slate-900 dark:text-zinc-100 truncate">
                            {Number.isFinite(id) ? id : '—'}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/15 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-200 shrink-0">
                            ВЫБРАНО
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-indigo-100 dark:border-white/[0.06] bg-indigo-50/60 dark:bg-zinc-800/60 px-3.5 py-2.5 flex flex-col transition-colors duration-200">
                          <span className="text-[11px] uppercase tracking-wide text-indigo-500 dark:text-indigo-400 font-semibold">
                            Номер инвойса
                          </span>
                          <span className="mt-1 text-sm md:text-base font-bold text-indigo-900 dark:text-zinc-100">
                            {c?.invoice_number || '—'}
                          </span>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.05] bg-white/70 dark:bg-zinc-800/40 px-3.5 py-2.5 flex flex-col transition-colors duration-200">
                          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-zinc-600 font-semibold">
                            Дата инвойса
                          </span>
                          <span className="mt-1 text-sm md:text-base font-medium text-slate-900 dark:text-zinc-200">
                            {c?.invoice_date || '—'}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-300 dark:border-white/[0.08] shadow-sm transition-colors">
          <div className="border-b rounded-2xl border-slate-200 dark:border-white/[0.08] px-6 py-3 bg-slate-50 dark:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-950 ring-1 ring-slate-200 dark:ring-white/[0.08]">
                <Receipt className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Обзор</h2>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-fr items-stretch">
              {(() => {
                const PartyCard = ({
                  title,
                  badge,
                  tone,
                  name,
                  address,
                  countryCode,
                }: {
                  title: string
                  badge: 'ТД' | 'Сайт'
                  tone: 'blue' | 'purple'
                  name: string
                  address: string
                  countryCode?: string
                }) => {
                  const isPrimary = badge === 'ТД'
                  const toneClasses =
                    tone === 'blue'
                      ? {
                          border: 'border-blue-200 dark:border-blue-500/25',
                          borderPrimary: 'border-blue-400 dark:border-blue-400/45',
                          headerText: 'text-blue-950 dark:text-blue-100',
                          cardBg: isPrimary ? 'bg-blue-100/80 dark:bg-blue-500/16' : 'bg-white dark:bg-zinc-950/20',
                          headerBg: isPrimary ? 'bg-blue-200/70 dark:bg-blue-500/22' : 'bg-slate-50/60 dark:bg-white/[0.03]',
                          badgeBg:
                            badge === 'ТД'
                              ? 'bg-blue-100 dark:bg-blue-500/16'
                              : 'bg-white dark:bg-white/[0.06]',
                          badgeBorder:
                            badge === 'ТД'
                              ? 'border-blue-300 dark:border-blue-400/40'
                              : 'border-blue-200 dark:border-white/[0.10]',
                        }
                      : {
                          border: 'border-purple-200 dark:border-purple-500/25',
                          borderPrimary: 'border-purple-400 dark:border-purple-400/45',
                          headerText: 'text-purple-950 dark:text-purple-100',
                          cardBg: isPrimary ? 'bg-purple-100/80 dark:bg-purple-500/16' : 'bg-white dark:bg-zinc-950/20',
                          headerBg: isPrimary ? 'bg-purple-200/70 dark:bg-purple-500/22' : 'bg-slate-50/60 dark:bg-white/[0.03]',
                          badgeBg:
                            badge === 'ТД'
                              ? 'bg-purple-100 dark:bg-purple-500/16'
                              : 'bg-white dark:bg-white/[0.06]',
                          badgeBorder:
                            badge === 'ТД'
                              ? 'border-purple-300 dark:border-purple-400/40'
                              : 'border-purple-200 dark:border-white/[0.10]',
                        }

                  return (
                    <div
                      className={`rounded-2xl border ${isPrimary ? toneClasses.borderPrimary : toneClasses.border} ${toneClasses.cardBg} shadow-sm transition-colors h-full flex flex-col min-h-[140px] ${
                        isPrimary ? 'ring-2 ring-slate-900/8 dark:ring-white/14 ring-inset' : ''
                      }`}
                    >
                      <div className={`px-4 py-3 border-b border-slate-200/70 dark:border-white/[0.08] ${toneClasses.headerBg} rounded-t-2xl`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className={`text-[11px] font-bold uppercase tracking-wide ${toneClasses.headerText}`}>
                            {title}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${toneClasses.badgeBg} ${toneClasses.headerText} border ${toneClasses.badgeBorder} transition-colors`}>
                            {badge}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col gap-2">
                        <div className="text-[15px] font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2" title={name}>
                          {name || '—'}
                        </div>
                        <div
                          className="mt-0.5 pt-2 border-t border-slate-500 dark:border-white/[0.08] text-xs text-slate-700 dark:text-zinc-300 font-medium leading-relaxed flex items-center gap-1.5 flex-wrap"
                          title={[countryCode, address].filter(Boolean).join(', ') || '—'}
                        >
                          {countryCode ? (
                            <span className="inline-flex items-center justify-center box-border shrink-0 rounded-md border border-amber-500 px-2 py-[3px] text-[15px] font-bold leading-none tracking-wide text-amber-900 bg-amber-200 dark:text-amber-100 dark:bg-amber-500/25 dark:border-amber-400/70">
                              {countryCode}
                            </span>
                          ) : null}
                          <span className="min-w-0 line-clamp-3">{address || (countryCode ? '' : '—')}</span>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <>
                    <PartyCard
                      tone="blue"
                      title="Отправитель из ТД"
                      badge="ТД"
                      name={parsedData.consignor?.name || '—'}
                      address={parsedData.consignor?.address || ''}
                      countryCode={parsedData.consignor?.countryCode}
                    />
                    <PartyCard
                      tone="purple"
                      title="Получатель из ТД"
                      badge="ТД"
                      name={parsedData.consignee?.name || '—'}
                      address={parsedData.consignee?.address || ''}
                      countryCode={parsedData.consignee?.countryCode}
                    />
                    <PartyCard
                      tone="blue"
                      title="Отправитель"
                      badge="Сайт"
                      name={dbContainerData?.consignor || '—'}
                      address={dbContainerData?.sender_address || '—'}
                    />
                    <PartyCard
                      tone="purple"
                      title="Получатель"
                      badge="Сайт"
                      name={dbContainerData?.consignee || '—'}
                      address={dbContainerData?.recipient_address || '—'}
                    />
                  </>
                )
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-300 dark:border-white/[0.08] p-3 bg-white dark:bg-zinc-950/30 shadow-sm transition-colors">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-zinc-300 mb-2">Маршрут</div>
                <div className="flex items-center gap-1.5">
                  <div className={`flex-1 min-w-0 rounded-lg px-2 py-1.5 border ${
                    isDepartureCountryMatch
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-400 dark:border-emerald-500/40'
                      : 'bg-red-100 dark:bg-rose-500/20 border-red-400 dark:border-rose-500/40'
                  }`}>
                    <div className={`text-[9px] font-bold uppercase tracking-wide ${
                      isDepartureCountryMatch ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-rose-200'
                    }`}>Отправление</div>
                    <div className={`text-xl font-black tracking-wider leading-none mt-1 ${
                      isDepartureCountryMatch ? 'text-emerald-950 dark:text-emerald-50' : 'text-red-950 dark:text-rose-50'
                    }`}>
                      {parsedData.departureCountry || '—'}
                    </div>
                  </div>
                  <span className="shrink-0 text-lg font-black text-slate-400 dark:text-zinc-500">→</span>
                  <div className={`flex-1 min-w-0 rounded-lg px-2 py-1.5 border ${
                    isDestinationCountryMatch
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-400 dark:border-emerald-500/40'
                      : 'bg-red-100 dark:bg-rose-500/20 border-red-400 dark:border-rose-500/40'
                  }`}>
                    <div className={`text-[9px] font-bold uppercase tracking-wide ${
                      isDestinationCountryMatch ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-rose-200'
                    }`}>Назначение</div>
                    <div className={`text-xl font-black tracking-wider leading-none mt-1 ${
                      isDestinationCountryMatch ? 'text-emerald-950 dark:text-emerald-50' : 'text-red-950 dark:text-rose-50'
                    }`}>
                      {parsedData.destinationCountry || '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5 rounded-lg px-2 py-1 border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03]">
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Пост</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {parsedData.customsOffice || '—'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-300 dark:border-white/[0.08] p-3 bg-white dark:bg-zinc-950/30 shadow-sm flex flex-col min-h-[110px] transition-colors">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-zinc-300 mb-2">Пломбы</div>
                <div className="flex-1 flex flex-wrap justify-center items-center gap-2">
                  {parsedData.seals && parsedData.seals.length > 0 ? parsedData.seals.map((seal, idx) => (
                    <span key={idx} className="inline-flex items-center text-xl font-mono font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-zinc-200 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-white/[0.08]">
                      {seal}
                    </span>
                  )) : <span className="text-base text-slate-500 dark:text-zinc-500">—</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-300 dark:border-white/[0.08] p-3 bg-white dark:bg-zinc-950/30 shadow-sm flex flex-col min-h-[110px] transition-colors">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-zinc-300 mb-2">Номер ЖД накладной</div>
                <div className="flex-1 flex flex-col items-center justify-center gap-1 text-center">
                  <div className="text-xl font-bold text-slate-900 dark:text-white break-all">
                    {uniqueDocuments.find(doc => doc.code === '02013')?.id || '—'}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                    {uniqueDocuments.find(doc => doc.code === '02013')?.date || '—'}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-300 dark:border-white/[0.08] p-3 bg-white dark:bg-zinc-950/30 shadow-sm transition-colors">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-zinc-300 mb-1">Экспедитор</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{parsedData.declarant?.name || dbContainerData?.expeditor || '—'}</div>
                <div className="text-xs text-slate-600 dark:text-zinc-400 mt-1">{parsedData.declarant?.taxpayerId || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm transition-colors overflow-hidden">
          <div className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Train className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                  Номер транспортного средства в ТД
                </p>
              </div>
              <div className={`group relative w-full rounded-2xl border-2 p-4 text-left transition-colors ${
                containerConsistency.isOk
                  ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-500/20 dark:to-emerald-500/10 border-emerald-400 dark:border-emerald-500/35 ring-2 ring-emerald-500/25 ring-inset'
                  : 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-500/10 dark:to-indigo-500/5 border-indigo-200 dark:border-indigo-500/20'
              }`}>
                <div style={{ fontFamily: 'Montserrat, sans-serif' }} className="flex flex-wrap items-center gap-3">
                  <p 
                    className={`text-xl md:text-3xl font-bold font-mono break-words ${
                      containerConsistency.isOk ? 'text-emerald-900 dark:text-emerald-100' : 'text-indigo-700 dark:text-indigo-300'
                    }`}
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {parsedData.transportMeansRegId || '—'}
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                      containerConsistency.isOk
                        ? 'bg-emerald-300/90 text-emerald-950 border-emerald-500 ring-2 ring-emerald-500/25 ring-inset dark:bg-emerald-500/25 dark:text-emerald-50 dark:border-emerald-400/40 dark:ring-emerald-400/20'
                        : 'bg-rose-300/90 text-rose-950 border-rose-500 ring-2 ring-rose-500/25 ring-inset dark:bg-rose-500/25 dark:text-rose-50 dark:border-rose-400/40 dark:ring-rose-400/20'
                    }`}
                  >
                    {containerConsistency.isOk ? 'ОК' : 'ОШИБКА'}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  <div className="flex flex-wrap items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>

                    <span style={{ fontFamily: 'Montserrat, sans-serif' }} className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      Контейнер в товарах:{" "}
                      <span className="font-mono font-bold monts" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {containerConsistency.uniqueItemIds.length === 0
                          ? '—'
                          : containerConsistency.uniqueItemIds.length === 1
                          ? containerConsistency.uniqueItemIds[0]
                          : containerConsistency.uniqueItemIds.join(', ')}
                      </span>
                    </span>
                  </div>

                  {!containerConsistency.isOk && (
                    <div style={{ fontFamily: 'Montserrat, sans-serif' }} className="rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50/70 dark:bg-rose-500/10 px-3 py-2 text-xs text-rose-900 dark:text-rose-100 font-semibold leading-relaxed">
                      {containerConsistency.differsBetweenItems && (
                        <div>
                          Номер контейнера в некоторых товарах неверно — значения отличаются между товарами.
                        </div>
                      )}
                      {containerConsistency.differsFromTransportMeans && (
                        <div style={{ fontFamily: 'Montserrat, sans-serif' }} className={containerConsistency.differsBetweenItems ? 'mt-1.5' : ''}>
                          Номер транспортного средства и Номер контейнера в товарах отличаются.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm transition-colors">
          <div className="border-b border-slate-200 dark:border-white/[0.08] px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-600 dark:text-zinc-300" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Итоги сверки</h2>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className={`rounded-2xl border p-3 shadow-sm transition-colors ${overviewData.goodsMatch === true ? 'bg-emerald-300/90 border-emerald-500 ring-2 ring-emerald-500/35 ring-inset dark:bg-emerald-500/25 dark:border-emerald-400/40 dark:ring-emerald-400/25' : overviewData.goodsMatch === false ? 'bg-rose-300/90 border-rose-500 ring-2 ring-rose-500/35 ring-inset dark:bg-rose-500/25 dark:border-rose-400/40 dark:ring-rose-400/25' : 'bg-slate-100 border-slate-300 dark:bg-white/[0.04] dark:border-white/[0.08]'}`}>
              <div className="text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">Товаров</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{overviewData.xmlGoodsCount}</div>
              <div className="text-xs text-slate-600 dark:text-zinc-400">ПО САЙТУ: {overviewData.dbItemsCount}</div>
            </div>
              <div className={`rounded-2xl border p-3 shadow-sm transition-colors ${overviewData.placesMatch === true ? 'bg-emerald-300/90 border-emerald-500 ring-2 ring-emerald-500/35 ring-inset dark:bg-emerald-500/25 dark:border-emerald-400/40 dark:ring-emerald-400/25' : overviewData.placesMatch === false ? 'bg-rose-300/90 border-rose-500 ring-2 ring-rose-500/35 ring-inset dark:bg-rose-500/25 dark:border-rose-400/40 dark:ring-rose-400/25' : 'bg-slate-100 border-slate-300 dark:bg-white/[0.04] dark:border-white/[0.08]'}`}>
              <div className="text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">Количество мест</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{overviewData.xmlPlaces}</div>
              <div className="text-xs text-slate-600 dark:text-zinc-400">ПО САЙТУ: {formatNumber(overviewData.dbPlaces)}</div>
            </div>
              <div className={`rounded-2xl border p-3 shadow-sm transition-colors ${overviewData.weightMatch === true ? 'bg-emerald-300/90 border-emerald-500 ring-2 ring-emerald-500/35 ring-inset dark:bg-emerald-500/25 dark:border-emerald-400/40 dark:ring-emerald-400/25' : overviewData.weightMatch === false ? 'bg-rose-300/90 border-rose-500 ring-2 ring-rose-500/35 ring-inset dark:bg-rose-500/25 dark:border-rose-400/40 dark:ring-rose-400/25' : 'bg-slate-100 border-slate-300 dark:bg-white/[0.04] dark:border-white/[0.08]'}`}>
              <div className="text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">Вес брутто</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalWeight}</div>
              <div className="text-xs text-slate-600 dark:text-zinc-400">ПО САЙТУ: {formatNumber(dbTotals.totalWeight)}</div>
            </div>
              <div className={`rounded-2xl border p-3 shadow-sm transition-colors ${overviewData.valueMatch === true ? 'bg-emerald-300/90 border-emerald-500 ring-2 ring-emerald-500/35 ring-inset dark:bg-emerald-500/25 dark:border-emerald-400/40 dark:ring-emerald-400/25' : overviewData.valueMatch === false ? 'bg-rose-300/90 border-rose-500 ring-2 ring-rose-500/35 ring-inset dark:bg-rose-500/25 dark:border-rose-400/40 dark:ring-rose-400/25' : 'bg-slate-100 border-slate-300 dark:bg-white/[0.04] dark:border-white/[0.08]'}`}>
              <div className="text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">Стоимость</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(overviewData.xmlAmount)} {parsedData.currency}</div>
              <div className="text-xs text-slate-600 dark:text-zinc-400">ПО САЙТУ: {formatNumber(overviewData.dbValue)}</div>
            </div>
          </div>
        </div>

        {sortedXmlGoodsItems && sortedXmlGoodsItems.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-lg transition-colors overflow-hidden">
            <div className="border-b border-slate-200 dark:border-white/[0.08] px-0 py-0">
              <button
                type="button"
                onClick={() => setGoodsCollapsed(v => !v)}
                className="w-full flex items-center justify-between gap-3 text-left cursor-pointer rounded-2xl px-2 py-2 transition duration-100 hover:bg-slate-300/90 dark:hover:bg-white/[0.05] hover:shadow-sm active:bg-slate-300/70 dark:active:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
                aria-expanded={!goodsCollapsed}
              >
                <div className="flex items-center gap-3 min-w-0 w-full">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.06] dark:to-white/[0.02] ring-1 ring-slate-200/60 dark:ring-white/[0.08]">
                    <Package className="w-5 h-5 text-slate-700 dark:text-zinc-200" />
                  </div>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                      Товары контейнера — {primaryContainerId || '—'}
                    </h2>
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 font-semibold rounded-lg border border-emerald-200 dark:border-emerald-500/25 text-sm whitespace-nowrap transition-colors">
                      Точность: {goodsValidationStats.percent}%
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-white/[0.06] rounded-lg text-sm font-semibold text-slate-700 dark:text-zinc-300 whitespace-nowrap transition-colors">
                      {sortedXmlGoodsItems.length} {sortedXmlGoodsItems.length === 1 ? 'товар' : sortedXmlGoodsItems.length < 5 ? 'товара' : 'товаров'}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 dark:text-zinc-500 transition-transform duration-100 shrink-0 ${goodsCollapsed ? '-rotate-90' : ''}`}
                  />
                </div>
              </button>
            </div>
            
            <div className={`${goodsCollapsed ? 'hidden' : 'block'} p-4`}>
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-indigo-200 dark:bg-zinc-950/20 overflow-x-auto transition-colors overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/[0.08] bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Товары из ТД</h3>
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/15 rounded text-xs font-semibold text-emerald-700 dark:text-emerald-200 transition-colors">
                        {sortedXmlGoodsItems.length}
                      </span>
                    </div>
                  </div>
                  <table className="w-full text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    <thead>
                      <tr className="text-left bg-slate-200/80 dark:bg-white/[0.08] border-b border-slate-400/80 dark:border-white/[0.12] transition-colors">
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]" style={{ width: getColumnWidth('Код ТН ВЭД') }}>Код ТН ВЭД</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]" style={{ width: getColumnWidth('Коммерческое описание товара') }}>Коммерческое описание товара</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Свободен от запретов (всегда 1)') }}>Свободен от запретов (всегда 1)</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Информация об упаковке (0-БЕЗ, 1 С)') }}>Информация об упаковке (0-БЕЗ, 1 С)</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Количество грузовых мест') }}>Количество грузовых мест</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Вид информации об упаковке (всегда 0)') }}>Вид информации об упаковке (всегда 0)</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]" style={{ width: getColumnWidth('Вид упаковки') }}>Вид упаковки</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Количество упаковок') }}>Количество упаковок</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Номер контейнера') }}>Номер контейнера</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]" style={{ width: '120px' }}>Вес брутто</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]" style={{ width: getColumnWidth('Валюта') }}>Валюта</th>
                        <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs" style={{ width: '120px' }}>Сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/[0.08]">
                      {sortedXmlGoodsItems.map((item, index) => {
                        const comparison = compareItemWithDB(item, primaryContainerId, index)
                        const matches = comparison.fieldMatches || {}
                        const hasDbItem = comparison.hasData && comparison.matchingDbItem
                        const getMatchClass = (isMatch?: boolean) =>
                          hasDbItem
                            ? (isMatch
                              ? 'bg-emerald-300/90 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50 font-bold ring-2 ring-emerald-500/35 dark:ring-emerald-400/25 ring-inset'
                              : 'bg-rose-300/90 text-rose-950 dark:bg-rose-500/25 dark:text-rose-50 font-bold ring-2 ring-rose-500/35 dark:ring-rose-400/25 ring-inset')
                            : 'text-slate-900 dark:text-zinc-100'

                        const hasInvalidGrossMass = isLessThanMin(item.grossMass, MIN_XML_GROSS_MASS)
                        const hasInvalidValueAmount = isLessThanMin(item.value, MIN_XML_VALUE_AMOUNT)
                        const invalidValueClass = 'bg-amber-100 text-amber-950 dark:bg-amber-500/15 dark:text-amber-200 font-bold ring-2 ring-amber-400/40 dark:ring-amber-400/30 ring-inset'

                        return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-white/[0.02]'}>
                          <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs tabular-nums font-medium ${getMatchClass(matches.commodityCode)}`}>{item.commodityCode || ''}</td>
                          <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs font-medium ${getMatchClass(matches.description)}`}>{item.description || ''}</td>
                          <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs text-center tabular-nums font-medium ${item.restrictionsFree === '1'
                            ? 'bg-emerald-300/90 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50 font-bold ring-2 ring-emerald-500/35 dark:ring-emerald-400/25 ring-inset'
                            : 'bg-rose-300/90 text-rose-950 dark:bg-rose-500/25 dark:text-rose-50 font-bold ring-2 ring-rose-500/35 dark:ring-rose-400/25 ring-inset'}`}>{item.restrictionsFree || '1'}</td>
                          <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs text-center tabular-nums font-medium ${getMatchClass(matches.packagingInfo)}`}>{item.packagingInfo || '0'}</td>
                          <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs text-center tabular-nums font-medium ${getMatchClass(matches.cargoPlaces)}`}>{formatNumber(item.cargoPlaces) || ''}</td>
                          <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs text-center tabular-nums font-medium ${item.packagingInfoType === '0'
                            ? 'bg-emerald-300/90 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50 font-bold ring-2 ring-emerald-500/35 dark:ring-emerald-400/25 ring-inset'
                            : 'bg-rose-300/90 text-rose-950 dark:bg-rose-500/25 dark:text-rose-50 font-bold ring-2 ring-rose-500/35 dark:ring-rose-400/25 ring-inset'}`}>{item.packagingInfoType || '0'}</td>
                          <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs font-medium ${getMatchClass(matches.packageCode)}`}>{item.packageCode || ''}</td>
                          <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs text-center tabular-nums font-medium ${getMatchClass(matches.packageQuantity)}`}>{formatNumber(item.packageQuantity) || ''}</td>
                          <td
                            className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs tabular-nums font-medium ${hasDbItem ? getMatchClass(matches.containerId) : 'text-slate-900 dark:text-zinc-100'}`}
                            title={!hasDbItem ? undefined : matches.containerId ? undefined : 'Номер контейнера в товаре не совпадает с номером транспортного средства/контейнера'}
                          >
                            {item.containerId || ''}
                          </td>
                          <td
                            className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs tabular-nums font-medium ${hasInvalidGrossMass ? invalidValueClass : getMatchClass(matches.grossMass)}`}
                            style={{ width: '120px' }}
                            title={hasInvalidGrossMass ? '&#9888; Брутто &gt; 0,001' : undefined}
                          >
                            {hasInvalidGrossMass ? (
                              <div className="flex flex-col leading-tight">
                                <span>{formatNumber(item.grossMass) || ''}</span>
                                <span className="mt-0.5 text-[10px] font-semibold opacity-90">
                                &#9888; Брутто &gt; 0,001
                                </span>
                              </div>
                            ) : (
                              formatNumber(item.grossMass) || ''
                            )}
                          </td>
                          <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs font-medium ${getMatchClass(matches.valueCurrency)}`}>{item.valueCurrency || ''}</td>
                          <td
                            className={`py-1.5 px-2 text-xs tabular-nums font-medium ${hasInvalidValueAmount ? invalidValueClass : getMatchClass(matches.value)}`}
                            style={{ width: '120px' }}
                            title={hasInvalidValueAmount ? '&#9888; Сумма &gt; 0,01' : undefined}
                          >
                            {hasInvalidValueAmount ? (
                              <div className="flex flex-col leading-tight">
                                <span>{formatNumber(item.value) || ''}</span>
                                <span className="mt-0.5 text-[10px] font-semibold opacity-90">
                                &#9888; Сумма &gt; 0,01
                                </span>
                              </div>
                            ) : (
                              formatNumber(item.value) || ''
                            )}
                          </td>
                        </tr>
                        )
                      })}
                      <tr className="bg-gradient-to-r from-indigo-200/80 via-indigo-300/60 to-indigo-200/80 dark:from-indigo-500/18 dark:via-indigo-500/14 dark:to-indigo-500/18 border-t-2 border-indigo-500/60 dark:border-indigo-500/35 font-semibold transition-colors">
                        <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Код ТН ВЭД') }}></td>
                        <td className={`py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-sm font-bold text-indigo-900 dark:text-indigo-200 ${getTotalMatchClass(overviewData.goodsMatch)}`} style={{ letterSpacing: '0.01em', width: getColumnWidth('Коммерческое описание товара') }}>
                          ИТОГО: {sortedXmlGoodsItems.length} {sortedXmlGoodsItems.length === 1 ? 'товар' : sortedXmlGoodsItems.length < 5 ? 'товара' : 'товаров'}
                        </td>
                        <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Свободен от запретов (всегда 1)') }}></td>
                        <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Информация об упаковке (0-БЕЗ, 1 С)') }}></td>
                        <td className={`py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-sm text-center font-bold tabular-nums text-indigo-900 dark:text-indigo-200 ${getTotalMatchClass(overviewData.placesMatch)}`} style={{ width: getColumnWidth('Количество грузовых мест') }}>
                          {formatNumber(xmlTotals.totalPlaces)}
                        </td>
                        <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Вид информации об упаковке (всегда 0)') }}></td>
                        <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Вид упаковки') }}></td>
                        <td className={`py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-sm text-center font-bold tabular-nums text-indigo-900 dark:text-indigo-200 ${getTotalMatchClass(packageQuantityMatch)}`} style={{ width: getColumnWidth('Количество упаковок') }}>
                          {formatNumber(xmlTotals.totalPackageQuantity)}
                        </td>
                        <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Номер контейнера') }}></td>
                        <td className={`py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-sm font-bold tabular-nums text-indigo-900 dark:text-indigo-200 ${getTotalMatchClass(overviewData.weightMatch)}`} style={{ width: '120px' }}>
                          {formatNumber(xmlTotals.totalWeight)}
                        </td>
                        <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Валюта') }}></td>
                        <td className={`py-3 px-3 text-sm font-bold tabular-nums text-indigo-900 dark:text-indigo-200 ${getTotalMatchClass(overviewData.valueMatch)}`} style={{ width: '120px' }}>
                          {formatNumber(xmlTotals.totalValue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-indigo-200 dark:bg-zinc-950/20 overflow-x-auto transition-colors overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/[0.08] bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-500/5 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Товары с сайта</h3>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/15 rounded text-xs font-semibold text-blue-700 dark:text-blue-200 transition-colors">
                        {sortedDbItemsCurrentContainer.length || 0}
                      </span>
                    </div>
                  </div>
                  {sortedDbItemsCurrentContainer && sortedDbItemsCurrentContainer.length > 0 ? (
                    <table className="w-full text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      <thead>
                      <tr className="text-left bg-slate-200/80 dark:bg-white/[0.08] border-b border-slate-400/80 dark:border-white/[0.12] transition-colors">
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]" style={{ width: getColumnWidth('Код ТН ВЭД') }}>Код ТН ВЭД</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]" style={{ width: getColumnWidth('Коммерческое описание товара') }}>Коммерческое описание товара</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Свободен от запретов (всегда 1)') }}>Свободен от запретов (всегда 1)</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Информация об упаковке (0-БЕЗ, 1 С)') }}>Информация об упаковке (0-БЕЗ, 1 С)</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Количество грузовых мест') }}>Количество грузовых мест</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Вид информации об упаковке (всегда 0)') }}>Вид информации об упаковке (всегда 0)</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]" style={{ width: getColumnWidth('Вид упаковки') }}>Вид упаковки</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Количество упаковок') }}>Количество упаковок</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] whitespace-normal" style={{ width: getColumnWidth('Номер контейнера') }}>Номер контейнера</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]" style={{ width: '120px' }}>Вес брутто</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]" style={{ width: getColumnWidth('Валюта') }}>Валюта</th>
                          <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs" style={{ width: '120px' }}>Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/[0.08]">
                        {sortedDbItemsCurrentContainer.map((dbItem: any, index: number) => {
                          const xmlItem = sortedXmlGoodsItems?.[index]
                          const comparison = xmlItem ? compareItemWithDB(xmlItem, primaryContainerId, index) : null
                          const matches = comparison?.fieldMatches || {}
                          const hasXmlItem = Boolean(xmlItem && comparison?.matchingDbItem)
                          const getMatchClass = (isMatch?: boolean) =>
                            hasXmlItem
                              ? (isMatch
                                ? 'bg-emerald-300/90 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50 font-bold ring-2 ring-emerald-500/35 dark:ring-emerald-400/25 ring-inset'
                                : 'bg-rose-300/90 text-rose-950 dark:bg-rose-500/25 dark:text-rose-50 font-bold ring-2 ring-rose-500/35 dark:ring-rose-400/25 ring-inset')
                              : 'text-slate-900 dark:text-zinc-100'
                          // container id match (XML item container vs DB container key)
                          const containerCellClass = hasXmlItem ? getMatchClass(matches.containerId) : 'text-slate-900 dark:text-zinc-100'
                          return (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-white/[0.02]'}>
                            <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs tabular-nums font-medium ${getMatchClass(matches.commodityCode)}`}>{dbItem.code || ''}</td>
                            <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs font-medium ${getMatchClass(matches.description)}`}>{dbItem.goods_name || ''}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs text-center tabular-nums font-medium bg-emerald-300/90 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50 font-bold ring-2 ring-emerald-500/35 dark:ring-emerald-400/25 ring-inset">1</td>
                            <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs text-center tabular-nums font-medium ${getMatchClass(matches.packagingInfo)}`}>
                              {normalizePackagingInfo(dbItem.packaging_info ?? dbItem.package_info)}
                            </td>
                            <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs text-center tabular-nums font-medium ${getMatchClass(matches.cargoPlaces)}`}>{formatNumber(dbItem.places) || ''}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs text-center tabular-nums font-medium bg-emerald-300/90 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50 font-bold ring-2 ring-emerald-500/35 dark:ring-emerald-400/25 ring-inset">0</td>
                            <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs font-medium ${getMatchClass(matches.packageCode)}`}>{dbItem.package_type || ''}</td>
                            <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs text-center tabular-nums font-medium ${getMatchClass(matches.packageQuantity)}`}>{formatNumber(dbItem.places) || ''}</td>
                            <td
                              className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs tabular-nums font-medium ${containerCellClass}`}
                              style={{ width: getColumnWidth('Номер контейнера') }}
                              title={!hasXmlItem ? undefined : matches.containerId ? undefined : 'Номер контейнера на сайте не совпадает с номером контейнера в XML товаре'}
                            >
                              {dbContainerData.container_number || ''}
                            </td>
                            <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs tabular-nums font-medium ${getMatchClass(matches.grossMass)}`} style={{ width: '120px' }}>{formatNumber(dbItem.weight) || ''}</td>
                            <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs font-medium ${getMatchClass(matches.valueCurrency)}`}>{dbItem.currency || ''}</td>
                            <td className={`py-1.5 px-2 text-xs tabular-nums font-medium ${getMatchClass(matches.value)}`} style={{ width: '120px' }}>{formatNumber(dbItem.value_amount) || ''}</td>
                          </tr>
                          )
                        })}
                        <tr className="bg-gradient-to-r from-indigo-200/80 via-indigo-300/60 to-indigo-200/80 dark:from-indigo-500/18 dark:via-indigo-500/14 dark:to-indigo-500/18 border-t-2 border-indigo-500/60 dark:border-indigo-500/35 font-semibold transition-colors">
                          <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Код ТН ВЭД') }}></td>
                          <td className={`py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-sm font-bold text-indigo-900 dark:text-indigo-200 ${getTotalMatchClass(overviewData.goodsMatch)}`} style={{ letterSpacing: '0.01em', width: getColumnWidth('Коммерческое описание товара') }}>
                            ИТОГО: {sortedDbItemsCurrentContainer.length} {sortedDbItemsCurrentContainer.length === 1 ? 'товар' : sortedDbItemsCurrentContainer.length < 5 ? 'товара' : 'товаров'}
                          </td>
                          <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Свободен от запретов (всегда 1)') }}></td>
                          <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Информация об упаковке (0-БЕЗ, 1 С)') }}></td>
                          <td className={`py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-sm text-center font-bold tabular-nums text-indigo-900 dark:text-indigo-200 ${getTotalMatchClass(overviewData.placesMatch)}`} style={{ width: getColumnWidth('Количество грузовых мест') }}>
                            {formatNumber(dbTotals.totalPlaces)}
                          </td>
                          <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Вид информации об упаковке (всегда 0)') }}></td>
                          <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Вид упаковки') }}></td>
                          <td className={`py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-sm text-center font-bold tabular-nums text-indigo-900 dark:text-indigo-200 ${getTotalMatchClass(packageQuantityMatch)}`} style={{ width: getColumnWidth('Количество упаковок') }}>
                            {formatNumber(dbTotals.totalPlaces)}
                          </td>
                          <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Номер контейнера') }}></td>
                          <td className={`py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-sm font-bold tabular-nums text-indigo-900 dark:text-indigo-200 ${getTotalMatchClass(overviewData.weightMatch)}`} style={{ width: '120px' }}>
                            {formatNumber(dbTotals.totalWeight)}
                          </td>
                          <td className="py-3 px-3 border-r border-indigo-200 dark:border-indigo-500/20 text-xs" style={{ width: getColumnWidth('Валюта') }}></td>
                          <td className={`py-3 px-3 text-sm font-bold tabular-nums text-indigo-900 dark:text-indigo-200 ${getTotalMatchClass(overviewData.valueMatch)}`} style={{ width: '120px' }}>
                            {formatNumber(dbTotals.totalValue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-zinc-500">По этому контейнеру товары с сайта не найдены</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-lg p-12 text-center transition-colors">
            <Package className="w-16 h-16 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-zinc-500">Нет данных о товарах</p>
          </div>
        )}

        {uniqueDocuments.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-lg transition-colors overflow-hidden">
            <div className="border-b border-slate-200 dark:border-white/[0.08] px-4 py-2.5 bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-500/10 dark:to-purple-500/5 transition-colors">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Документы</h2>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-500/15 rounded text-xs font-semibold text-purple-700 dark:text-purple-200 transition-colors">
                  {uniqueDocuments.length}
                </span>
              </div>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '36%' }} />
                  <col style={{ width: '26%' }} />
                  <col style={{ width: '26%' }} />
                </colgroup>
                <thead>
                  <tr className="text-left bg-slate-100 dark:bg-white/[0.05] border-b border-slate-300 dark:border-white/[0.08] transition-colors">
                    <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08] rounded-tl-2xl">КОД</th>
                    <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]">Название</th>
                    <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs border-r border-slate-300 dark:border-white/[0.08]">Номер</th>
                    <th className="py-1.5 px-2 font-semibold text-slate-800 dark:text-zinc-200 text-xs rounded-tr-2xl">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/[0.08]">
                  {uniqueDocuments.map((doc, idx) => {
                    const docTypeName =
                      doc.code === '04131'
                        ? 'Инвойс'
                        : doc.code === '04021'
                        ? 'Упаковочный лист'
                        : doc.code === '02013'
                        ? 'ЖД накладная'
                        : 'Документ'
                    const docTitle =
                      (doc.name || '').trim() ||
                      (doc.id || '').trim() ||
                      docTypeName

                    const numberClass =
                      doc.numberMatch === true
                        ? 'bg-emerald-300/90 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50 font-bold ring-2 ring-emerald-500/35 dark:ring-emerald-400/25 ring-inset'
                        : doc.numberMatch === false
                        ? 'bg-rose-300/90 text-rose-950 dark:bg-rose-500/25 dark:text-rose-50 font-bold ring-2 ring-rose-500/35 dark:ring-rose-400/25 ring-inset'
                        : 'text-slate-700 dark:text-zinc-300'

                    const dateClass =
                      doc.dateMatch === true
                        ? 'bg-emerald-300/90 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50 font-bold ring-2 ring-emerald-500/35 dark:ring-emerald-400/25 ring-inset'
                        : doc.dateMatch === false
                        ? 'bg-rose-300/90 text-rose-950 dark:bg-rose-500/25 dark:text-rose-50 font-bold ring-2 ring-rose-500/35 dark:ring-rose-400/25 ring-inset'
                        : 'text-slate-700 dark:text-zinc-300'

                    const isInvoiceOrPacking = doc.code === '04131' || doc.code === '04021'
                    const isFullyValid = doc.numberMatch === true && doc.dateMatch === true
                    const rowHighlightClass =
                      isInvoiceOrPacking && isFullyValid
                        ? '!bg-emerald-200/90 dark:!bg-emerald-500/18 ring-2 ring-emerald-500/25 ring-inset'
                        : ''

                    return (
                      <tr
                        key={idx}
                        className={`${idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-white/[0.02]'} ${rowHighlightClass}`}
                      >
                        <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-900 dark:text-zinc-100 ${rowHighlightClass}`}>{doc.code || '---'}</td>
                        <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs truncate text-slate-900 dark:text-zinc-100 ${rowHighlightClass}`} title={docTitle}>{docTitle}</td>
                        <td className={`py-1.5 px-2 border-r border-slate-200 dark:border-white/[0.08] text-xs ${rowHighlightClass} ${numberClass}`}>
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-semibold">{doc.id || '—'}</span>
                            {doc.numberMatch === false && dbContainerData?.invoice_number && (
                              <span className="text-[10px] font-medium opacity-90">
                                ПО САЙТУ: {dbContainerData.invoice_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-1.5 px-2 text-xs ${rowHighlightClass} ${dateClass}`}>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{doc.date || '—'}</span>
                            {doc.dateMatch === false && dbContainerData?.invoice_date && (
                              <span className="text-[10px] font-medium opacity-90">
                                ПО САЙТУ: {dbContainerData.invoice_date}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-lg p-12 text-center transition-colors">
            <FileCheck className="w-16 h-16 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-zinc-500">Нет документов</p>
          </div>
        )}

      </div>
    </main>
  )
}