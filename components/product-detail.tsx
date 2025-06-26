"use client"

import React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast, useToast } from "@/components/ui/use-toast"


interface ProductImage {
  url: string
  isPrimary?: boolean
}

interface Product {
  id: string
  title: string
  description: string
  price: number
  sellerId: string
  images: ProductImage[]
  category: {
    name: string
  }
  condition: string
  seller: {
    name: string
    image?: string
  }
  createdAt: string
}

interface ProductDetailProps {
  product: Product
  currentUserId: string | null
}


export default function ProductDetail({ product, currentUserId }: ProductDetailProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleBuyNow = async () => {
    if (product.sellerId === currentUserId) {
      toast({
        title: "Cannot purchase your own product",
        description: "You cannot buy your own product.",
        variant: "destructive",
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      const response = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          productId: product.id,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to initiate checkout");
      }
  
      const data = await response.json();
      toast({
        title: "OTP Sent",
        description: "Check your email for the OTP to authorize the payment.",
      });
  
      // Redirect to the payment gateway
      router.push(`/marketplace/${product.id}/payment`);
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initiate checkout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleBuyNow} 
      disabled={isLoading} 
      style={{
      border: "2px solid #000", 
      padding: "10px 20px", 
      borderRadius: "5px", 
      backgroundColor: isLoading ? "#ccc" : "#007bff", 
      cursor: isLoading ? "not-allowed" : "pointer"
      }}
    >
      {isLoading ? "Processing..." : "Buy Now"}
    </button>
  );
}

