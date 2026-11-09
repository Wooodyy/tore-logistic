import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// Отключаем кэширование для актуальных данных при каждом запросе
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sql = getDb()
    
    const orders = await sql`
      SELECT 
        o.id,
        o.order_number,
        c.name as client_name,
        o.created_at
      FROM orders o
      INNER JOIN clients c ON o.client_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 60
    `

    return NextResponse.json({ orders }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({ orders: [], error: "Ошибка подключения БД" }, { status: 200 })
  }
}
