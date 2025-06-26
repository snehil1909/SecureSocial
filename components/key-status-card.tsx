"use client"

import { useState, useEffect } from "react"
import { KeyRound, AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface KeyStatusCardProps {
  userId: string
  userName?: string | null
}

export function KeyStatusCard({ userId, userName }: KeyStatusCardProps) {
  const [hasKeys, setHasKeys] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const checkUserKeys = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/users/key-status?userId=${userId}`)
        if (!response.ok) {
          throw new Error("Failed to check user key status")
        }
        
        const data = await response.json()
        setHasKeys(data.hasKeys)
      } catch (error) {
        console.error("Error checking user key status:", error)
        setHasKeys(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkUserKeys()
  }, [userId])

  if (isLoading) {
    return null
  }

  if (hasKeys === true) {
    return null
  }

  return (
    <Card className="bg-amber-50 border-amber-200 p-4 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
        <div className="flex-1">
          <h3 className="font-medium text-amber-800 mb-1">
            {userName || "This user"} doesn't have encryption keys
          </h3>
          <p className="text-amber-700 text-sm mb-2">
            They won't be able to read your messages until they generate encryption keys.
          </p>
          <p className="text-amber-700 text-sm">
            Please ask them to go to their profile settings and generate encryption keys.
          </p>
        </div>
      </div>
    </Card>
  )
} 