import postgres from "postgres"

let sql: ReturnType<typeof postgres> | null = null

export function getDb() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl || databaseUrl.includes("your_database_url_here")) {
      throw new Error("DATABASE_URL is not configured")
    }

    sql = postgres(databaseUrl, {
      ssl: databaseUrl.includes("localhost") ? false : "require",
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  }

  return sql
}

export async function queryDatabase<T = Record<string, unknown>>(query: string, params?: unknown[]): Promise<T[]> {
  try {
    const db = getDb()
    // postgres.js uses template literals for parameterized queries
    // For $1, $2 syntax, we need to convert to template literal format
    if (params && params.length > 0) {
      // Convert $1, $2 placeholders to template literal format
      // Split query into parts and values for template literal
      const parts: string[] = []
      const values: unknown[] = []
      
      // Find all $N placeholders and their positions
      const placeholders: Array<{ pos: number; num: number; length: number }> = []
      const regex = /\$(\d+)/g
      let match
      
      while ((match = regex.exec(query)) !== null) {
        const num = parseInt(match[1], 10)
        if (num > 0 && num <= params.length) {
          placeholders.push({
            pos: match.index,
            num: num,
            length: match[0].length
          })
        }
      }
      
      // Sort by position
      placeholders.sort((a, b) => a.pos - b.pos)
      
      // Build parts array
      let lastPos = 0
      for (const ph of placeholders) {
        parts.push(query.substring(lastPos, ph.pos))
        values.push(params[ph.num - 1])
        lastPos = ph.pos + ph.length
      }
      parts.push(query.substring(lastPos))
      
      // Call postgres with template literal parts
      // postgres.js supports calling sql function with array of strings and values
      const result = await (db as any)(parts as any, ...values)
      return result as unknown as T[]
    } else {
      const result = await db.unsafe(query)
      return result as unknown as T[]
    }
  } catch (error) {
    // Re-throw to be caught by API routes
    throw error
  }
}


