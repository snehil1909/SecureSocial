"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export default function CreateProductForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm();

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
    const response = await fetch("/api/marketplace/products", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Something went wrong");
    }

      toast({
        title: "Success",
        description: "Your product has been listed successfully!",
      });

      // Hard-code the redirect to the marketplace route
      router.push("/marketplace");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create product",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form Fields */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-white py-2 rounded-md"
      >
        {isSubmitting ? "Submitting..." : "Create Listing"}
      </button>
    </form>
  );
}