import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { role: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ isAdmin: user.role === "ADMIN" }, { status: 200 })
  } catch (error) {
    console.error("Check admin error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
} 