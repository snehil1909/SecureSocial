import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security-logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, emailOtp } = body;

    if (!email || !emailOtp) {
      return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 });
    }

    // Verify email OTP
    const otpRecord = await db.oTP.findFirst({
      where: {
        type: "EMAIL",
        email,
        code: emailOtp.trim(),
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 });
    }

    // Delete the OTP after successful verification
    await db.oTP.delete({
      where: { id: otpRecord.id },
    });

    // Log successful verification
    await logSecurityEvent({
      eventType: "OTP_VERIFICATION_SUCCESS",
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: { email },
      severity: "INFO",
    });

    return NextResponse.json({ message: "OTP verified successfully" }, { status: 200 });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ message: "An error occurred during verification" }, { status: 500 });
  }
}