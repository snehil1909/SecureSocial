"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

interface BuyNowButtonProps {
  productId: string;
}

export default function BuyNowButton({ productId }: BuyNowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleBuyNow = async () => {
    if (!session || !session.user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to continue with the purchase.",
        variant: "destructive",
      });
      router.push("/login");
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
          userId: session.user.id, // Include the userId from session
          productId,
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
      router.push(`/marketplace/${productId}/payment`);
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
      className="w-full py-3 text-lg font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      onClick={handleBuyNow}
      disabled={isLoading}
    >
      {isLoading ? "Processing..." : "Buy Now"}
    </button>
  );
}