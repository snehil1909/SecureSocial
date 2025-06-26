import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logSecurityEvent } from "@/lib/security-logger"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, otp } = body

    if (!email || !otp) {
      return NextResponse.json({ message: "Email and verification code are required" }, { status: 400 })
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 400 })
    }

    // Verify OTP
    const resetRecord = await db.passwordReset.findFirst({
      where: {
        userId: user.id,
        token: otp,
        expiresAt: {
          gt: new Date(),
        },
        used: false,
      },
    })

    if (!resetRecord) {
      await logSecurityEvent({
        eventType: "PASSWORD_RESET_VERIFICATION_FAILED",
        userId: user.id,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        details: { email },
        severity: "WARNING",
      })

      return NextResponse.json({ message: "Invalid or expired verification code" }, { status: 400 })
    }

    // Log successful verification
    await logSecurityEvent({
      eventType: "PASSWORD_RESET_VERIFICATION_SUCCESS",
      userId: user.id,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: { email },
      severity: "INFO",
    })

    return NextResponse.json({ message: "Verification successful" }, { status: 200 })
  } catch (error) {
    console.error("Verify reset OTP error:", error)
    return NextResponse.json({ message: "An error occurred during verification" }, { status: 500 })
  }
}

