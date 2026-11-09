import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const dynamic = "force-dynamic"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "2222"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = Number.parseInt(id)

    if (!orderId || isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: "Некорректный ID заказа" },
        { status: 400 }
      )
    }

    const sql = getDb()

    // 1. Fetch order info
    const orderResult = await sql`
      SELECT 
        o.id,
        o.order_number,
        c.name as client_name,
        o.created_at
      FROM orders o
      INNER JOIN clients c ON o.client_id = c.id
      WHERE o.id = ${orderId}
      LIMIT 1
    `

    if (orderResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Заказ не найден" },
        { status: 404 }
      )
    }

    const order = orderResult[0]

    // 2. Fetch all invoices / containers in this order with aggregated stats
    const invoices = await sql`
      SELECT 
        i.id,
        i.container,
        i.invoice_number,
        i.invoice_date,
        i.consignor,
        i.consignee,
        i.sender_address,
        i.recipient_address,
        COALESCE(i.invoice_status, false) as invoice_status,
        COUNT(ii.id)::int as items_count,
        COALESCE(SUM(ii.places), 0)::int as total_places,
        COALESCE(SUM(ii.weight), 0)::float as total_weight
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      WHERE i.order_id = ${orderId}
      GROUP BY i.id, i.container, i.invoice_number, i.invoice_date, i.consignor, i.consignee, i.sender_address, i.recipient_address, i.invoice_status
      ORDER BY i.container ASC, i.id ASC
    `

    // Summary statistics for this order
    const totalContainers = invoices.length
    const totalItems = invoices.reduce((sum: number, inv: any) => sum + (inv.items_count || 0), 0)
    const totalPlaces = invoices.reduce((sum: number, inv: any) => sum + (inv.total_places || 0), 0)
    const totalWeight = invoices.reduce((sum: number, inv: any) => sum + (inv.total_weight || 0), 0)
    const totalCorrected = invoices.reduce((sum: number, inv: any) => sum + (inv.invoice_status ? 1 : 0), 0)
    const totalPi = totalContainers - totalCorrected

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        totalContainers,
        totalItems,
        totalPlaces,
        totalWeight,
        totalCorrected,
        totalPi,
      },
      invoices,
    })
  } catch (error) {
    console.error("Admin order detail error:", error)
    return NextResponse.json(
      { success: false, error: "Ошибка при загрузке данных заказа" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = Number.parseInt(id)

    const authHeader = request.headers.get("x-admin-password")
    const body = await request.json().catch(() => ({}))
    const password = authHeader || body.password

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "Неавторизовано" },
        { status: 401 }
      )
    }

    if (!orderId || isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: "Некорректный ID заказа" },
        { status: 400 }
      )
    }

    const sql = getDb()

    const result = await sql.begin(async (tx) => {
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
      message: `Заказ #${result.deletedOrder.order_number} удален`,
    })
  } catch (error: any) {
    console.error("Delete order error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка при удалении заказа" },
      { status: 500 }
    )
  }
}


