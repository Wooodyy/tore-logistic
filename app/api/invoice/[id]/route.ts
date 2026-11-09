import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// Отключаем кэширование для актуальных данных при каждом запросе
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const invoiceId = Number.parseInt(id)

    if (!invoiceId) {
      return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 })
    }

    const sql = getDb()
    
    const result = await sql`
      SELECT 
        i.id,
        i.container AS container_number,
        i.invoice_number,
        i.invoice_date,
        i.consignor,
        i.consignee,
        i.sender_address,
        i.recipient_address,
        COALESCE(i.invoice_status, false) AS invoice_status,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ii.id,
              'code', ii.code,
              'goods_name', ii.goods_name,
              'places', ii.places,
              'weight', ii.weight::text,
              'value_amount', ii.value_amount::text,
              'currency', ii.currency,
              'packaging_type', ii.package_type,
              'packaging_info', ii.package_info
            )
            ORDER BY ii.id
          ) FILTER (WHERE ii.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      WHERE i.id = ${invoiceId}
      GROUP BY i.id, i.container, i.invoice_number, i.invoice_date, i.consignor, i.consignee, i.sender_address, i.recipient_address, i.invoice_status
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = result[0]
    // Убеждаемся, что items всегда массив
    if (!invoice.items || !Array.isArray(invoice.items)) {
      invoice.items = []
    }

    return NextResponse.json({ invoice }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error("Invoice fetch error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Ошибка подключения БД", details: errorMessage }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const invoiceId = Number.parseInt(id)

    if (!invoiceId) {
      return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 })
    }

    const body = await request.json()
    const { itemId, packagingType, packagingInfo, updateAll, updateAllPackagingInfo, updateAllCurrency,
            code, goods_name, places, weight, value_amount, currency, invoice_status } = body

    const sql = getDb()

    // Прямое обновление статуса инвойса (по ПИ / по исправленному)
    if (invoice_status !== undefined) {
      const boolStatus = Boolean(invoice_status)
      await sql`
        UPDATE invoices
        SET invoice_status = ${boolStatus}
        WHERE id = ${invoiceId}
      `
      return NextResponse.json({
        success: true,
        message: "Статус инвойса обновлен",
        invoice_status: boolStatus,
        statusLabel: boolStatus ? "Сделан по Исправленному инвойсу" : "Сделан по ПИ"
      })
    }
    
    if (updateAll === true) {
      // Обновить все товары в инвойсе (package_type)
      if (!packagingType) {
        return NextResponse.json({ error: "packagingType is required when updateAll is true" }, { status: 400 })
      }

      await sql`
        UPDATE invoice_items
        SET package_type = ${packagingType}
        WHERE invoice_id = ${invoiceId}
      `

      return NextResponse.json({ success: true, message: "All items updated" })
    } else if (updateAllPackagingInfo === true) {
      // Обновить все товары в инвойсе (package_info)
      if (packagingInfo === undefined) {
        return NextResponse.json({ error: "packagingInfo is required when updateAllPackagingInfo is true" }, { status: 400 })
      }

      await sql`
        UPDATE invoice_items
        SET package_info = ${packagingInfo}
        WHERE invoice_id = ${invoiceId}
      `

      return NextResponse.json({ success: true, message: "All items updated" })
    } else if (updateAllCurrency === true) {
      // Обновить все товары в инвойсе (currency)
      if (currency === undefined) {
        return NextResponse.json({ error: "currency is required when updateAllCurrency is true" }, { status: 400 })
      }

      await sql`
        UPDATE invoice_items
        SET currency = ${currency || null}
        WHERE invoice_id = ${invoiceId}
      `

      return NextResponse.json({ success: true, message: "All items updated" })
    } else {
      // Обновить один товар
      if (!itemId) {
        return NextResponse.json({ error: "itemId is required" }, { status: 400 })
      }

      // Обновляем все поля товара, если они переданы
      // Сначала обновляем package_type и package_info для обратной совместимости
      if (packagingType !== undefined) {
        await sql`
          UPDATE invoice_items
          SET package_type = ${packagingType || null}
          WHERE id = ${itemId} AND invoice_id = ${invoiceId}
        `
      }

      if (packagingInfo !== undefined) {
        await sql`
          UPDATE invoice_items
          SET package_info = ${packagingInfo}
          WHERE id = ${itemId} AND invoice_id = ${invoiceId}
        `
      }

      // Обновляем остальные поля, если они переданы
      if (code !== undefined) {
        await sql`
          UPDATE invoice_items
          SET code = ${code || null}
          WHERE id = ${itemId} AND invoice_id = ${invoiceId}
        `
      }
      if (goods_name !== undefined) {
        await sql`
          UPDATE invoice_items
          SET goods_name = ${goods_name || null}
          WHERE id = ${itemId} AND invoice_id = ${invoiceId}
        `
      }
      if (places !== undefined) {
        const placesValue = places !== null && places !== '' ? Number(places) : null
        await sql`
          UPDATE invoice_items
          SET places = ${placesValue}
          WHERE id = ${itemId} AND invoice_id = ${invoiceId}
        `
      }
      if (weight !== undefined) {
        const weightValue = weight !== null && weight !== '' 
          ? (typeof weight === 'string' ? parseFloat(weight.replace(',', '.')) : weight) 
          : null
        await sql`
          UPDATE invoice_items
          SET weight = ${weightValue}
          WHERE id = ${itemId} AND invoice_id = ${invoiceId}
        `
      }
      if (value_amount !== undefined) {
        const valueAmountValue = value_amount !== null && value_amount !== '' 
          ? (typeof value_amount === 'string' ? parseFloat(value_amount.replace(',', '.')) : value_amount) 
          : null
        await sql`
          UPDATE invoice_items
          SET value_amount = ${valueAmountValue}
          WHERE id = ${itemId} AND invoice_id = ${invoiceId}
        `
      }
      if (currency !== undefined) {
        await sql`
          UPDATE invoice_items
          SET currency = ${currency || null}
          WHERE id = ${itemId} AND invoice_id = ${invoiceId}
        `
      }

      return NextResponse.json({ success: true, message: "Item updated" })
    }
  } catch (error) {
    console.error("Invoice update error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Ошибка обновления БД", details: errorMessage }, { status: 500 })
  }
}


