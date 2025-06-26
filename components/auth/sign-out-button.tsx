"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"

interface SignOutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function SignOutButton({ variant = "default", size = "default", className = "" }: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Reset loading state if component unmounts during sign-out process
  useEffect(() => {
    return () => {
      if (isLoading) setIsLoading(false)
    }
  }, [isLoading])

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      console.log("Starting sign out process")
      
      // Use the form submission approach which is more reliable
      const form = document.getElementById('signout-form') as HTMLFormElement
      if (form) {
        form.submit()
      } else {
        // Fallback direct navigation if form isn't available
        window.location.href = "/api/auth/signout"
      }
    } catch (error) {
      console.error("Sign out error:", error)
      setIsLoading(false)
      toast({
        title: "Sign out failed",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={handleSignOut} disabled={isLoading}>
        {isLoading ? "Signing out..." : "Sign out"}
      </Button>
      
      {/* Hidden form for sign out */}
      <form method="post" action="/api/auth/signout" id="signout-form" className="hidden">
        <input type="hidden" name="callbackUrl" value="/" />
      </form>
    </>
  )
}

