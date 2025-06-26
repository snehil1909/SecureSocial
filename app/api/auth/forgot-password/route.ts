import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOTP } from "@/lib/utils";
import { sendEmail } from "@/lib/email"; // Ensure this utility is correctly implemented
import { logSecurityEvent } from "@/lib/security-logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, phone, type } = body;

    if (!email && !phone) {
      return NextResponse.json({ message: "Email or phone is required" }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (type === "email" && email) {
      // Delete any existing OTPs for this email
      await db.oTP.deleteMany({
        where: { email },
      });

      // Store OTP in the database
      await db.oTP.create({
        data: {
          type: "EMAIL",
          email,
          code: otp,
          expiresAt,
        },
      });

      // Send OTP via email
      await sendEmail({
        to: email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
      });

      // Log the event
      await logSecurityEvent({
        eventType: "OTP_GENERATED",
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        details: { type: "email", email },
        severity: "INFO",
      });

      return NextResponse.json({ message: "OTP sent to email" }, { status: 200 });
    }

    if (type === "phone" && phone) {
      // Delete any existing OTPs for this phone
      await db.oTP.deleteMany({
        where: { phone },
      });

      // Store OTP in the database
      await db.oTP.create({
        data: {
          type: "PHONE",
          phone,
          code: otp,
          expiresAt,
        },
      });

      // Log the event (you can integrate SMS sending here if needed)
      await logSecurityEvent({
        eventType: "OTP_GENERATED",
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        details: { type: "phone", phone },
        severity: "INFO",
      });

      return NextResponse.json({ message: "OTP sent to phone" }, { status: 200 });
    }

    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ message: "An error occurred while sending OTP" }, { status: 500 });
  }
}