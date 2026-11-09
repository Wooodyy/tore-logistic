import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { containerNumber } = await request.json()

    if (!containerNumber) {
      return NextResponse.json({ error: "Missing containerNumber" }, { status: 400 })
    }

    const sql = getDb()
    
    // Find container(s) in the database. There may be duplicates with same number.
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
              'package_type', ii.package_type,
              'package_info', ii.package_info
            )
            ORDER BY ii.id
          ) FILTER (WHERE ii.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      WHERE i.container = ${containerNumber}
      GROUP BY i.id, i.container, i.invoice_number, i.invoice_date, i.consignor, i.consignee, i.sender_address, i.recipient_address
    `

    if (result.length === 0) {
      return NextResponse.json({ found: false, container: null })
    }

    const containers = result.map((row: any) => {
      const container = row
      // Ensure items is always an array
      if (!container.items || !Array.isArray(container.items)) {
        container.items = []
      }
      // Format invoice_date to DD.MM.YYYY if it exists
      if (container.invoice_date) {
        try {
          const date = new Date(container.invoice_date)
          const day = String(date.getDate()).padStart(2, '0')
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const year = date.getFullYear()
          container.invoice_date = `${day}.${month}.${year}`
        } catch (e) {
          console.error('Error formatting date:', e)
        }
      }
      return container
    })

    // Backward compatible: keep `container` as the first one.
    return NextResponse.json({ found: true, container: containers[0] ?? null, containers })
  } catch (error) {
    console.error("Container validation error:", error)
    return NextResponse.json({ found: false, container: null, error: "Ошибка подключения БД" }, { status: 200 })
  }
}

