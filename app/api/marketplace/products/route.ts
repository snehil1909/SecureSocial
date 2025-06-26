import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, price, categoryId, condition, images } = body;

    if (!title || !description || !price || !categoryId || !condition || !images || images.length === 0) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    if (price > 5000) {
      return NextResponse.json({ message: "Product price cannot exceed $5000" }, { status: 400 });
    }

    // Create the product
    const product = await db.product.create({
      data: {
        title,
        description,
        price,
        categoryId,
        condition,
        sellerId: session.user.id,
        images: {
          createMany: {
            data: images.map((url: string, index: number) => ({
              url,
              isPrimary: index === 0,
            })),
          },
        },
      },
    });

    return NextResponse.json({ message: "Product created successfully", product }, { status: 201 });
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json({ message: "An error occurred during product creation" }, { status: 500 });
  }
}