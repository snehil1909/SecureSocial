import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, otp } = body;

    const otpRecord = await db.oTP.findFirst({
      where: {
        type: "PAYMENT",
        code: otp,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    const user = await db.user.findUnique({ where: { email: otpRecord.email } });

    if (!user || !product) {
      return NextResponse.json({ message: "User or product not found" }, { status: 404 });
    }

    if (user.balance < product.price) {
      return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { balance: user.balance - product.price },
    });

    await db.product.update({
      where: { id: productId },
      data: { status: "SOLD" },
    });

    await db.OTP.delete({ where: { id: otpRecord.id } });

    return NextResponse.json({ message: "Payment successful" }, { status: 200 });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ message: "An error occurred during payment verification" }, { status: 500 });
  }
}