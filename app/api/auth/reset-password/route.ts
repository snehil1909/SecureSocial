import { NextResponse } from "next/server"
import { hash } from "bcrypt"
import { db } from "@/lib/db"
import { logSecurityEvent } from "@/lib/security-logger"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, otp, password } = body

    if (!email || !otp || !password) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 })
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
        eventType: "PASSWORD_RESET_FAILED",
        userId: user.id,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        details: { email },
        severity: "WARNING",
      })

      return NextResponse.json({ message: "Invalid or expired verification code" }, { status: 400 })
    }

    // Hash the new password
    const hashedPassword = await hash(password, 12)

    // Update user password
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    })

    // Mark reset token as used
    await db.passwordReset.update({
      where: {
        id: resetRecord.id,
      },
      data: {
        used: true,
      },
    })

    // Log password reset
    await logSecurityEvent({
      eventType: "PASSWORD_RESET_SUCCESS",
      userId: user.id,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: { email },
      severity: "INFO",
    })

    return NextResponse.json({ message: "Password reset successful" }, { status: 200 })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ message: "An error occurred during password reset" }, { status: 500 })
  }
}

