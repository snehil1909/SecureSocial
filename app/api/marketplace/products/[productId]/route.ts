import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const product = await db.product.findUnique({
      where: {
        id: params.productId,
      },
    });

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    // Check if the user is the owner of the product
    if (product.sellerId !== session.user.id) {
      return NextResponse.json({ message: "Not authorized to delete this product" }, { status: 403 });
    }

    // Delete the product
    await db.product.delete({
      where: {
        id: params.productId,
      },
    });

    return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ message: "An error occurred while deleting the product" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { productId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const productId = params.productId
    const body = await req.json()
    const { title, description, price, categoryId, condition, images } = body

    // Check if product exists and belongs to the current user
    const product = await db.product.findUnique({
      where: {
        id: productId,
      },
    })

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 })
    }

    // Verify the current user is the seller
    if (product.sellerId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden - You can only edit your own listings" }, { status: 403 })
    }

    // Update the product
    const updatedProduct = await db.product.update({
      where: {
        id: productId,
      },
      data: {
        title,
        description,
        price,
        categoryId,
        condition,
        images: {
          deleteMany: {},
          createMany: {
            data: images.map((url: string, index: number) => ({
              url,
              isPrimary: index === 0,
            })),
          },
        },
      },
      include: {
        seller: true,
        images: true,
        category: true,
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Update product error:", error)
    return NextResponse.json({ message: "An error occurred while updating the product" }, { status: 500 })
  }
}