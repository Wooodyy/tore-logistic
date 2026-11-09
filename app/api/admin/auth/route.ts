import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "2222"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: "Неверный пароль администратора" },
      { status: 401 }
    )
  } catch (error) {
    console.error("Admin auth error:", error)
    return NextResponse.json(
      { success: false, error: "Ошибка сервера при авторизации" },
      { status: 500 }
    )
  }
}

