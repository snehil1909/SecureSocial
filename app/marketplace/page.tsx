import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import MarketplaceFilters from "@/components/marketplace-filters"
import ProductGrid from "@/components/product-grid"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const category = typeof searchParams.category === "string" ? searchParams.category : undefined
  const minPrice = typeof searchParams.minPrice === "string" ? Number.parseInt(searchParams.minPrice) : undefined
  const maxPrice = typeof searchParams.maxPrice === "string" ? Number.parseInt(searchParams.maxPrice) : undefined
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "newest"
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined

  const products = await db.product.findMany({
    where: {
      ...(category ? { category: { is: { name: category } } } : {}),
      ...(minPrice ? { price: { gte: minPrice } } : {}),
      ...(maxPrice ? { price: { lte: maxPrice } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      status: "ACTIVE",
    },
    include: {
      seller: true,
      images: true,
    },
    orderBy:
      sort === "price_asc" ? { price: "asc" } : sort === "price_desc" ? { price: "desc" } : { createdAt: "desc" },
  })

  const categories = await db.category.findMany()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <Link href="/marketplace/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            List Item
          </Button>
        </Link>
      </div>

      <MarketplaceFilters categories={categories} />

      <ProductGrid products={products} />
    </div>
  )
}

