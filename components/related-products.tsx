import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface RelatedProductsProps {
  products: any[]
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {products.map((product) => {
        const primaryImage = product.images.find((img: any) => img.isPrimary) || product.images[0]

        return (
          <Link key={product.id} href={`/marketplace/${product.id}`}>
            <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square relative">
                <img
                  src={primaryImage?.url || "/placeholder.svg?height=200&width=200"}
                  alt={product.title}
                  className="object-cover w-full h-full"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{product.title}</h3>
                <p className="text-lg font-bold text-primary mt-1">{formatCurrency(product.price)}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

