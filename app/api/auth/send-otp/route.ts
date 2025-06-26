import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateOTP } from "@/lib/utils"
import { sendEmail } from "@/lib/email"
import { logSecurityEvent } from "@/lib/security-logger"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      console.log("email daal ")
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    // Generate a 6-digit OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Check if email exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser && !body.isPasswordReset) {
      return NextResponse.json({ message: "Email already registered" }, { status: 409 })
    }

    // Delete any existing OTPs for this email
    await db.oTP.deleteMany({
      where: { email }
    })

    // Store OTP in database
    await db.oTP.create({
      data: {
        type: "EMAIL",
        email,
        code: otp,
        expiresAt,
      },
    })

    // Send OTP via email
    await sendEmail({
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
    })

    // Log the event
    await logSecurityEvent({
      eventType: "OTP_GENERATED",
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: { type: "email", email },
      severity: "INFO",
    })

    return NextResponse.json({ message: "OTP sent to email" }, { status: 200 })
  } catch (error) {
    console.error("Send OTP error:", error)
    return NextResponse.json({ message: "An error occurred while sending OTP" }, { status: 500 })
  }
}

