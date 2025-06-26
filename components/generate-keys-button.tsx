"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { KeyRound, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface GenerateKeysButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  className?: string
  fullWidth?: boolean
}

export function GenerateKeysButton({ 
  variant = "default", 
  className = "",
  fullWidth = false
}: GenerateKeysButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const { toast } = useToast()

  const handleGenerateKeys = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/users/generate-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate keys")
      }

      const data = await response.json()
      
      toast({
        title: "Success",
        description: "Your encryption keys have been generated successfully.",
      })

      // Reload page to update UI
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error("Failed to generate keys:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate keys",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setShowDialog(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant={variant}
        className={className}
        size="sm"
        disabled={isLoading}
        style={fullWidth ? { width: '100%' } : {}}
      >
        <KeyRound className="h-4 w-4 mr-2" />
        Generate Encryption Keys
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Encryption Keys</DialogTitle>
            <DialogDescription>
              You need encryption keys to participate in secure chats. Keys are generated and stored on your device for end-to-end encrypted messages.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm mb-4">
              When you generate keys:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Your messages will be secured with end-to-end encryption</li>
              <li>No one else can read your messages, not even the server administrators</li>
              <li>You'll be able to participate in secure individual and group chats</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleGenerateKeys} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Generate Keys
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 