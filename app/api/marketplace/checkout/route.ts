import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOTP } from "@/lib/utils";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, productId } = body;

    // Fetch the user and product
    const user = await db.user.findUnique({ where: { id: userId } });
    const product = await db.product.findUnique({ where: { id: productId } });

    if (!user || !product) {
      return NextResponse.json({ message: "User or product not found" }, { status: 404 });
    }

    if (user.balance < product.price) {
      return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
    }

    // Generate OTP for payment authorization
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP in the database
    await db.oTP.create({
      data: {
        type: "PAYMENT",
        email: user.email,
        code: otp,
        expiresAt,
      },
    });

    // Send OTP to the user's email
    await sendEmail({
      to: user.email,
      subject: "Payment Authorization OTP",
      text: `Your OTP for payment authorization is: ${otp}. It will expire in 10 minutes.`,
    });

    return NextResponse.json({ message: "OTP sent for payment authorization" }, { status: 200 });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ message: "An error occurred during checkout" }, { status: 500 });
  }
}