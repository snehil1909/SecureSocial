import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logSecurityEvent } from "@/lib/security-logger"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, timestamp, attempts } = body

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    })

    // Log the failed login attempt
    await logSecurityEvent({
      eventType: "FAILED_LOGIN_ATTEMPT",
      userId: user?.id, // May be undefined if user doesn't exist
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: { email, attempts, timestamp },
      severity: attempts >= 3 ? "HIGH" : "MEDIUM",
    })

    // If too many failed attempts, lock the account temporarily
    if (user && attempts >= 3) {
      await db.user.update({
        where: { id: user.id },
        data: {
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // Lock for 30 minutes
        },
      })

      await logSecurityEvent({
        eventType: "ACCOUNT_LOCKED",
        userId: user.id,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        details: { email, reason: "Too many failed login attempts" },
        severity: "HIGH",
      })
    }

    return NextResponse.json({ message: "Logged successfully" }, { status: 200 })
  } catch (error) {
    console.error("Log failed login error:", error)
    return NextResponse.json({ message: "An error occurred" }, { status: 500 })
  }
}

