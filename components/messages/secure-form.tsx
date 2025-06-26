"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SendHorizonal, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { sanitizeString } from "@/lib/security-client"

interface SecureFormProps {
  conversationId: string
  onMessageSent?: () => void
  publicKey?: string
  privateKey?: string
  keyFingerprint?: string
}

export function SecureForm({ 
  conversationId, 
  onMessageSent,
  publicKey,
  privateKey,
  keyFingerprint
}: SecureFormProps) {
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [csrfToken, setCsrfToken] = useState<string>("")
  const [refreshingToken, setRefreshingToken] = useState(false)
  const { toast } = useToast()

  // Get CSRF token on component mount
  useEffect(() => {
    getCsrfToken()
  }, [])

  const getCsrfToken = () => {
    // Extract CSRF token from cookies
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith('_csrf=')) {
        const token = cookie.substring('_csrf='.length);
        // console.log("Found CSRF token:", token);
        setCsrfToken(token);
        return;
      }
    }
    
    // console.log("No CSRF token found in cookies");
    setCsrfToken('');
  };

  // Function to refresh CSRF token
  const refreshCsrfToken = async () => {
    try {
      setRefreshingToken(true);
      
      // Make a POST request to force middleware to set a new CSRF token
      await fetch('/api/csrf-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh: true })
      });
      
      // Get the new token
      getCsrfToken();
      
      toast({
        title: "Security token refreshed",
        description: "You can now send messages.",
        duration: 3000
      });
    } catch (error) {
      console.error("Error refreshing CSRF token:", error);
      toast({
        title: "Error refreshing security token",
        description: "Please try reloading the page.",
        variant: "destructive"
      });
    } finally {
      setRefreshingToken(false);
    }
  };

  const submitDisabled = !message.trim() || isSubmitting || !publicKey || !privateKey || !csrfToken

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (submitDisabled) return
    
    setIsSubmitting(true)
    
    try {
      // Sanitize input to prevent XSS
      const sanitizedMessage = sanitizeString(message)
      
      if (!sanitizedMessage) {
        throw new Error("Message content cannot be empty")
      }
      
      // Limit message length for security
      if (sanitizedMessage.length > 5000) {
        throw new Error("Message is too long (maximum 5000 characters)")
      }
      
      // console.log("Sending message with CSRF token:", csrfToken)
      
      // Add CSRF token to headers
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({
          content: sanitizedMessage,
          conversationId,
          keyFingerprint
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        
        // If CSRF token is invalid, try refreshing it
        if (error.error === "Invalid CSRF token") {
          toast({
            title: "Security token expired",
            description: "Please click the refresh button and try again.",
            variant: "destructive"
          })
          refreshCsrfToken()
          throw new Error("Security token expired. Please try again.")
        }
        
        throw new Error(error.error || "Failed to send message")
      }
      
      // Clear form after successful submission
      setMessage("")
      
      // Notify parent component
      if (onMessageSent) {
        onMessageSent()
      }
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t flex flex-col">
      {!publicKey && (
        <div className="text-red-500 text-sm mb-2 w-full">
          You need encryption keys to send secure messages.
        </div>
      )}
      
      {!csrfToken && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded p-2 mb-2">
          <span className="text-amber-700 text-sm">
            Missing security token. Please refresh.
          </span>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={refreshCsrfToken}
            disabled={refreshingToken}
            className="text-amber-700 hover:text-amber-800 hover:bg-amber-100"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {refreshingToken ? "Refreshing..." : "Refresh Token"}
          </Button>
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <Textarea
          className="flex-1 min-h-20 resize-none"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={!publicKey || !privateKey || !csrfToken}
          maxLength={5000}
        />
        
        <Button 
          type="submit" 
          size="icon" 
          className="rounded-full h-10 w-10"
          disabled={submitDisabled}
        >
          <SendHorizonal className="h-5 w-5" />
        </Button>
      </div>
    </form>
  )
} 