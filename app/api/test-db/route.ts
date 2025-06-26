import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Try to get a count of users, a simple operation
    const userCount = await db.user.count()

    return NextResponse.json({ status: "Database is connected", userCount }, { status: 200 })
  } catch (error) {
    console.error("Database test error:", error)

    return NextResponse.json(
      {
        status: "Database connection failed",
        error: error.message,
        details: JSON.stringify(error, null, 2),
      },
      { status: 500 },
    )
  }
}

