"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface DeleteProductButtonProps {
  productId: string;
}

export default function DeleteProductButton({ productId }: DeleteProductButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/marketplace/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete product");
      }

      toast({
        title: "Product deleted",
        description: "Your listing has been successfully deleted.",
      });
      
      // Redirect to marketplace homepage
      router.push("/marketplace");
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault(); // Prevent any default navigation
          setShowConfirm(true);
        }}
        className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors"
        disabled={isDeleting}
      >
        <Trash2 className="h-5 w-5" />
        <span>Delete Listing</span>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-black p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-white">Confirm Deletion</h3>
            <p className="mb-6 text-gray-300">Are you sure you want to delete this listing? This action cannot be undone.</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 rounded-md text-white border border-gray-800"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-900 hover:bg-red-800 text-white rounded-md flex items-center justify-center"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                ) : null}
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}