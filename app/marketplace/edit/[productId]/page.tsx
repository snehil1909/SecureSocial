import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import EditProductForm from "./edit-form"

interface EditProductPageProps {
  params: {
    productId: string
  }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/sign-in")
  }

  const product = await db.product.findUnique({
    where: {
      id: params.productId,
    },
    include: {
      images: true,
      seller: true,
    },
  })

  if (!product) {
    redirect("/marketplace")
  }

  if (product.sellerId !== session.user.id) {
    redirect("/marketplace")
  }

  const categories = await db.category.findMany()

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Edit Listing</CardTitle>
        </CardHeader>
        <CardContent>
          <EditProductForm product={product} categories={categories} />
        </CardContent>
      </Card>
    </div>
  )
} 