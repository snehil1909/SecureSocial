import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// import { formatCurrency } from "@/lib/utils";  // Ensure this is the correct path

interface ProductGridProps {
  products: any[]
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold mb-2">No products found</h2>
        <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => {
        const primaryImage = product.images.find((img: any) => img.isPrimary) || product.images[0]

        return (
          <Link key={product.id} href={`/marketplace/${product.id}`}>
            <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square relative">
                <img
                  src={primaryImage?.url || "/placeholder.svg?height=300&width=300"}
                  alt={product.title}
                  className="object-cover w-full h-full"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{product.title}</h3>
                <p className="text-lg font-bold text-primary mt-1">{formatCurrency(product.price)}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex items-center">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={product.seller?.image || "/placeholder.svg"} alt={product.seller?.name || "Seller"} />
                  <AvatarFallback>
                    {product.seller?.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{product.seller?.name}</span>
              </CardFooter>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

