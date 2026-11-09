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

    const rawIds = body.invoiceIds !== undefined ? body.invoiceIds : (body.invoiceId ? [body.invoiceId] : [])
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Не переданы ID инвойсов для обновления статуса" },
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

    // Default status to true (сделан по исправленному) if not explicitly set to false
    const newStatus: boolean = body.status !== undefined ? Boolean(body.status) : true

    const sql = getDb()

    const updatedInvoices = await sql`
      UPDATE invoices
      SET invoice_status = ${newStatus}
      WHERE id = ANY(${invoiceIds})
      RETURNING id, container, invoice_number, invoice_status
    `

    const statusLabel = newStatus ? "Сделан по Исправленному инвойсу" : "Сделан по ПИ"

    return NextResponse.json({
      success: true,
      updatedCount: updatedInvoices.length,
      status: newStatus,
      statusLabel,
      updatedInvoices,
      message: `Статус успешно обновлен для ${updatedInvoices.length} инвойс(ов): ${statusLabel}`,
    })
  } catch (error: any) {
    console.error("Admin update-invoice-status error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка при обновлении статуса инвойсов" },
      { status: 500 }
    )
  }
}

export const PATCH = POST

