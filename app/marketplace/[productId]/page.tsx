import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import BuyNowButton from "@/components/buy-now-button";
import DeleteProductButton from "@/components/delete-product-button"; // Make sure this import is correct
import Link from "next/link";
import { Edit } from "lucide-react";

export default async function ProductPage({
  params,
}: {
  params: { productId: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch the product details
  const product = await db.product.findUnique({
    where: {
      id: params.productId,
      status: "ACTIVE",
    },
    include: {
      seller: true,
      images: true,
      category: true,
    },
  });

  if (!product) {
    notFound();
  }

  // Check if the current user is the seller
  const isOwner = session.user.id === product.sellerId;

  // Fetch related products
  const relatedProducts = await db.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      status: "ACTIVE",
    },
    include: {
      seller: true,
      images: true,
    },
    take: 4,
  });

  return (
    <div className="container mx-auto py-10 space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Product Images</h2>
          <div className="grid grid-cols-1 gap-4">
            {product.images.map((image, index) => (
              <div key={index} className="overflow-hidden rounded-lg shadow-md">
                <img
                  src={image.url}
                  alt={product.title}
                  className="w-full h-auto object-cover transition-transform hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Product Information */}
        <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{product.title}</h1>
          
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${product.price.toFixed(2)}
            </p>
            <span className="px-3 py-1 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full text-sm font-medium">
              {product.condition}
            </span>
          </div>
          
          <div className="border-t border-b border-gray-200 dark:border-gray-800 py-4">
            <p className="text-lg text-gray-700 dark:text-gray-300">{product.description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
              <p className="font-medium text-gray-800 dark:text-white">
                {product.category?.name || "Unknown"}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Seller</p>
              <p className="font-medium text-gray-800 dark:text-white">
                {product.seller?.name || "Unknown"}
              </p>
            </div>
          </div>

          {/* Conditional rendering based on ownership */}
          {isOwner ? (
            <div className="flex gap-4 mt-6">
              {/* Edit Button */}
              <Link 
                href={`/marketplace/edit/${product.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-black text-white rounded-lg transition-colors shadow-md border border-gray-700"
              >
                <Edit className="h-5 w-5" />
                <span>Edit Listing</span>
              </Link>
              
              {/* Delete Button - now using our client component */}
              <DeleteProductButton productId={product.id} />
            </div>
          ) : (
            /* Buy Now Button for non-owners */
            <div className="mt-6">
              <BuyNowButton productId={product.id} />
            </div>
          )}
        </div>
      </div>

      {/* Related Products Section */}
      <div className="pt-10 border-t border-gray-200 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Related Products</h2>
        {relatedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <Link
                key={relatedProduct.id}
                href={`/marketplace/${relatedProduct.id}`}
                className="group bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-800"
              >
                <div className="aspect-square overflow-hidden">
                  {relatedProduct.images.length > 0 && (
                    <img
                      src={relatedProduct.images[0].url}
                      alt={relatedProduct.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold truncate group-hover:text-gray-900 dark:group-hover:text-white transition-colors text-gray-800 dark:text-gray-200">
                    {relatedProduct.title}
                  </h3>
                  <p className="text-gray-900 dark:text-white font-bold mt-2">
                    ${relatedProduct.price.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center">No related products found.</p>
        )}
      </div>
    </div>
  );
}