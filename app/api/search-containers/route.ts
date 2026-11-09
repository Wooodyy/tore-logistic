import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { query, orderId } = await request.json()
    const sql = getDb()

    // Оптимизированный поиск по всем релевантным полям
    if (orderId && query && query.trim()) {
      const searchTerm = `%${query.trim()}%`
      
      // Получаем общее количество для поиска в заказе
      const totalCountResult = await sql`
        SELECT COUNT(*) as total
        FROM invoices i
        WHERE i.order_id = ${orderId}
          AND (
            i.container ILIKE ${searchTerm}
            OR i.invoice_number ILIKE ${searchTerm}
          )
      `
      const totalCount = parseInt(totalCountResult[0]?.total || '0')
      
      // Для поиска в конкретном заказе загружаем ВСЕ результаты без лимита
      const containers = await sql`
        SELECT 
          i.id,
          i.container as container_number,
          i.invoice_number,
          COALESCE(i.invoice_status, false) as invoice_status,
          i.order_id,
          o.order_number,
          c.name as client_name
        FROM invoices i
        INNER JOIN orders o ON i.order_id = o.id
        INNER JOIN clients c ON o.client_id = c.id
        WHERE i.order_id = ${orderId}
          AND (
            i.container ILIKE ${searchTerm}
            OR i.invoice_number ILIKE ${searchTerm}
          )
        ORDER BY o.created_at DESC, i.id DESC
      `
      return NextResponse.json({ containers, totalCount })
    } else if (orderId) {
      // Получаем общее количество контейнеров в заказе
      const totalCountResult = await sql`
        SELECT COUNT(*) as total
        FROM invoices i
        WHERE i.order_id = ${orderId}
      `
      const totalCount = parseInt(totalCountResult[0]?.total || '0')
      
      // Для конкретного заказа загружаем ВСЕ контейнеры без лимита
      const containers = await sql`
        SELECT 
          i.id,
          i.container as container_number,
          i.invoice_number,
          COALESCE(i.invoice_status, false) as invoice_status,
          i.order_id,
          o.order_number,
          c.name as client_name
        FROM invoices i
        INNER JOIN orders o ON i.order_id = o.id
        INNER JOIN clients c ON o.client_id = c.id
        WHERE i.order_id = ${orderId}
        ORDER BY o.created_at DESC, i.id DESC
      `
      return NextResponse.json({ containers, totalCount })
    } else if (query && query.trim()) {
      const searchTerm = `%${query.trim()}%`
      
      // Получаем общее количество для глобального поиска
      const totalCountResult = await sql`
        SELECT COUNT(*) as total
        FROM invoices i
        WHERE 
          i.container ILIKE ${searchTerm}
          OR i.invoice_number ILIKE ${searchTerm}
      `
      const totalCount = parseInt(totalCountResult[0]?.total || '0')
      
      const containers = await sql`
        SELECT 
          i.id,
          i.container as container_number,
          i.invoice_number,
          COALESCE(i.invoice_status, false) as invoice_status,
          i.order_id,
          o.order_number,
          c.name as client_name
        FROM invoices i
        INNER JOIN orders o ON i.order_id = o.id
        INNER JOIN clients c ON o.client_id = c.id
        WHERE 
          i.container ILIKE ${searchTerm}
          OR i.invoice_number ILIKE ${searchTerm}
        ORDER BY o.created_at DESC, i.id DESC
        LIMIT 60
      `
      return NextResponse.json({ containers, totalCount })
    } else {
      // Если нет параметров, возвращаем пустой массив
      return NextResponse.json({ containers: [], totalCount: 0 })
    }
  } catch (error) {
    console.error("Search containers error:", error)
    return NextResponse.json({ containers: [], totalCount: 0, error: "Ошибка подключения БД" }, { status: 200 })
  }
}
