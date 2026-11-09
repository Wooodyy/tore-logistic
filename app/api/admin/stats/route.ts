import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const sql = getDb()

    const [ordersResult, invoicesResult, itemsResult, clientsResult] = await Promise.all([
      sql`SELECT COUNT(*)::int as count FROM orders`,
      sql`SELECT COUNT(*)::int as count FROM invoices`,
      sql`SELECT COUNT(*)::int as count FROM invoice_items`,
      sql`SELECT COUNT(*)::int as count FROM clients`,
    ])

    return NextResponse.json({
      success: true,
      stats: {
        ordersCount: ordersResult[0]?.count || 0,
        invoicesCount: invoicesResult[0]?.count || 0,
        itemsCount: itemsResult[0]?.count || 0,
        clientsCount: clientsResult[0]?.count || 0,
        databaseName: "logistic_data",
        status: "connected",
      },
    })
  } catch (error) {
    console.error("Admin stats fetch error:", error)
    return NextResponse.json(
      { success: false, error: "Ошибка при получении аналитики БД" },
      { status: 500 }
    )
  }
}

