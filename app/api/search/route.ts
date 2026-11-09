import { type NextRequest, NextResponse } from "next/server"
import { queryDatabase } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 })
    }

    const searchTerm = `%${query}%`

    const orders = await queryDatabase(
      `
      SELECT DISTINCT
        o.id,
        o.order_number,
        c.name as client_name,
        o.created_at
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      LEFT JOIN invoices i ON o.id = i.order_id
      WHERE 
        o.order_number ILIKE $1
        OR i.container ILIKE $1
        OR c.name ILIKE $1
      ORDER BY o.created_at DESC
      LIMIT 50
    `,
      [searchTerm],
    )

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json({ orders: [], error: "Ошибка подключения БД" }, { status: 200 })
  }
}
