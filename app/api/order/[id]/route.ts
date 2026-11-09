import { type NextRequest, NextResponse } from "next/server"
import { queryDatabase } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const orderId = Number.parseInt(id)

    if (!orderId) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
    }

    const result = await queryDatabase(
      `
      SELECT 
        o.id as order_id,
        o.order_number,
        c.name as client_name,
        o.created_at,
        json_agg(
          json_build_object(
            'id', i.id,
            'invoice_number', i.invoice_number,
            'invoice_date', i.invoice_date,
            'container', i.container,
            'invoice_status', COALESCE(i.invoice_status, false),
            'consignor', i.consignor,
            'consignee', i.consignee,
            'sender_address', i.sender_address,
            'recipient_address', i.recipient_address,
            'items', (
              SELECT json_agg(
                json_build_object(
                  'id', ii.id,
                  'code', ii.code,
                  'goods_name', ii.goods_name,
                  'places', ii.places,
                  'weight', ii.weight,
                  'value_amount', ii.value_amount,
                  'currency', ii.currency
                )
              )
              FROM invoice_items ii
              WHERE ii.invoice_id = i.id
            )
          ) ORDER BY i.invoice_number
        ) as invoices
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      LEFT JOIN invoices i ON o.id = i.order_id
      WHERE o.id = $1
      GROUP BY o.id, o.order_number, c.name, o.created_at
    `,
      [orderId],
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ data: result[0] })
  } catch (error) {
    console.error("Order fetch error:", error)
    return NextResponse.json({ error: "Ошибка подключения БД" }, { status: 200 })
  }
}
