import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const dynamic = "force-dynamic"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "2222"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim() || ""

    const sql = getDb()

    let orders: any[]

    if (search) {
      const searchTerm = `%${search}%`
      orders = await sql`
        SELECT 
          o.id,
          o.order_number,
          c.name as client_name,
          o.created_at,
          COUNT(i.id)::int as invoices_count
        FROM orders o
        INNER JOIN clients c ON o.client_id = c.id
        LEFT JOIN invoices i ON i.order_id = o.id
        WHERE o.order_number ILIKE ${searchTerm}
           OR c.name ILIKE ${searchTerm}
        GROUP BY o.id, o.order_number, c.name, o.created_at
        ORDER BY o.created_at DESC
        LIMIT 200
      `
    } else {
      orders = await sql`
        SELECT 
          o.id,
          o.order_number,
          c.name as client_name,
          o.created_at,
          COUNT(i.id)::int as invoices_count
        FROM orders o
        INNER JOIN clients c ON o.client_id = c.id
        LEFT JOIN invoices i ON i.order_id = o.id
        GROUP BY o.id, o.order_number, c.name, o.created_at
        ORDER BY o.created_at DESC
        LIMIT 200
      `
    }

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error("Admin orders fetch error:", error)
    return NextResponse.json(
      { success: false, orders: [], error: "Ошибка при получении списка заказов" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("x-admin-password")
    const body = await request.json().catch(() => ({}))
    const password = authHeader || body.password

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "Неавторизовано: неверный пароль администратора" },
        { status: 401 }
      )
    }

    const orderId = Number(body.orderId)
    if (!orderId || isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: "Укажите корректный orderId" },
        { status: 400 }
      )
    }

    const sql = getDb()

    // Transactional deletion of order, invoices, and invoice_items
    const result = await sql.begin(async (tx) => {
      // Find invoices of this order
      const invoices = await tx`
        SELECT id FROM invoices WHERE order_id = ${orderId}
      `
      const invoiceIds: number[] = invoices.map((inv: any) => Number(inv.id))

      let deletedItemsCount = 0
      let deletedInvoicesCount = 0

      if (invoiceIds.length > 0) {
        const deletedItems = await tx`
          DELETE FROM invoice_items
          WHERE invoice_id = ANY(${invoiceIds})
          RETURNING id
        `
        deletedItemsCount = deletedItems.length

        const deletedInvoices = await tx`
          DELETE FROM invoices
          WHERE id = ANY(${invoiceIds})
          RETURNING id
        `
        deletedInvoicesCount = deletedInvoices.length
      }

      const deletedOrder = await tx`
        DELETE FROM orders
        WHERE id = ${orderId}
        RETURNING id, order_number
      `

      if (deletedOrder.length === 0) {
        throw new Error("Заказ не найден")
      }

      return {
        deletedOrder: deletedOrder[0],
        deletedInvoicesCount,
        deletedItemsCount,
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
      message: `Заказ #${result.deletedOrder.order_number} успешно удален (вместе с ${result.deletedInvoicesCount} инвойсами и ${result.deletedItemsCount} товарами)`,
    })
  } catch (error: any) {
    console.error("Admin delete order error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка при удалении заказа" },
      { status: 500 }
    )
  }
}
