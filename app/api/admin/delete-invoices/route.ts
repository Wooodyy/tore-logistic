import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const dynamic = "force-dynamic"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "2222"

export async function POST(request: NextRequest) {
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

    const rawIds = body.invoiceIds
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Не переданы ID инвойсов для удаления" },
        { status: 400 }
      )
    }

    const invoiceIds: number[] = rawIds
      .map((id: any) => Number(id))
      .filter((id: number) => !isNaN(id) && id > 0)

    if (invoiceIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Список ID инвойсов пуст или содержит некорректные значения" },
        { status: 400 }
      )
    }

    const sql = getDb()

    // Fully delete invoices and all their items in a single transaction
    const deletionResult = await sql.begin(async (tx) => {
      // 1. Delete all invoice_items for these invoices
      const deletedItems = await tx`
        DELETE FROM invoice_items
        WHERE invoice_id = ANY(${invoiceIds})
        RETURNING id
      `

      // 2. Delete the invoices themselves
      const deletedInvoices = await tx`
        DELETE FROM invoices
        WHERE id = ANY(${invoiceIds})
        RETURNING id, container, invoice_number
      `

      return {
        deletedInvoicesCount: deletedInvoices.length,
        deletedItemsCount: deletedItems.length,
        deletedInvoices,
      }
    })

    return NextResponse.json({
      success: true,
      deletedInvoicesCount: deletionResult.deletedInvoicesCount,
      deletedItemsCount: deletionResult.deletedItemsCount,
      deletedInvoices: deletionResult.deletedInvoices,
      message: `Успешно удалено ${deletionResult.deletedInvoicesCount} инвойсов и ${deletionResult.deletedItemsCount} товаров`,
    })
  } catch (error: any) {
    console.error("Admin delete-invoices error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка при удалении инвойсов" },
      { status: 500 }
    )
  }
}

export const DELETE = POST


