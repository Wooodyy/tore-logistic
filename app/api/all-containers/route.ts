import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// Отключаем кэширование для актуальных данных при каждом запросе
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { page = 1, limit = 6 } = await request.json()
    const sql = getDb()
    
    // Вычисляем offset для пагинации
    const offset = (page - 1) * limit
    
    // Получаем контейнеры с пагинацией + 1 дополнительный для определения есть ли еще страницы
    const containers = await sql`
      SELECT 
        i.id,
        i.container as container_number,
        i.invoice_number,
        COALESCE(i.invoice_status, false) as invoice_status,
        i.order_id,
        c.name as client_name
      FROM invoices i
      INNER JOIN orders o ON i.order_id = o.id
      INNER JOIN clients c ON o.client_id = c.id
      ORDER BY o.created_at DESC, i.id DESC
      LIMIT ${limit + 1}
      OFFSET ${offset}
    `

    // Проверяем есть ли следующая страница
    const hasMore = containers.length > limit
    const resultContainers = hasMore ? containers.slice(0, limit) : containers

    return NextResponse.json({ 
      containers: resultContainers, 
      hasMore,
      currentPage: page
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error("Error fetching containers:", error)
    return NextResponse.json({ containers: [], hasMore: false, error: "Ошибка подключения БД" }, { status: 200 })
  }
}
