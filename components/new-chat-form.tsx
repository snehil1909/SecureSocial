"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Search, User, Shield, AlertTriangle } from "lucide-react"
import { GenerateKeysButton } from "@/components/generate-keys-button"

export default function NewChatForm({ currentUserId }: { currentUserId: string }) {
  const [loading, setLoading] = useState(false)
  const [keysLoading, setKeysLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [message, setMessage] = useState("")
  const [users, setUsers] = useState<any[]>([])
  const [hasKeys, setHasKeys] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Fetch users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users")
        const data = await response.json()
        setUsers(data.filter((user: any) => user.id !== currentUserId))
      } catch (error) {
        console.error("Failed to load users:", error)
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        })
      }
    }
    fetchUsers()
  }, [currentUserId, toast])

  // Check if the current user has encryption keys
  useEffect(() => {
    const checkKeys = async () => {
      setKeysLoading(true)
      try {
        const response = await fetch("/api/users/keypair")
        const data = await response.json()
        setHasKeys(data.hasKeys)
      } catch (error) {
        console.error("Failed to check encryption keys:", error)
      } finally {
        setKeysLoading(false)
      }
    }
    checkKeys()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !message.trim()) {
      toast({
        title: "Invalid submission",
        description: "Please select a user and enter a message",
        variant: "destructive",
      })
      return
    }

    if (!hasKeys) {
      toast({
        title: "Encryption keys required",
        description: "Please wait while we generate your encryption keys",
      })
      return
    }

    setLoading(true)
    try {
      console.log("Creating new conversation with:", {
        userId: selectedUserId,
        message: message,
        currentUserId: currentUserId
      });
      
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserId,
          message,
        }),
      })

      const data = await response.json()
      // console.log("API response:", {
      //   status: response.status,
      //   statusText: response.statusText,
      //   data: data
      // });

      if (!response.ok) {
        throw new Error(data.error || "Failed to create conversation")
      }

      toast({
        title: "Success",
        description: "Conversation created",
      })

      router.push(`/messages/${data.conversationId}`)
      router.refresh()
    } catch (error: any) {
      console.error("Conversation creation failed:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // If we're still checking for encryption keys, show a loading state
  if (keysLoading) {
    return <div className="flex justify-center items-center h-full">Checking encryption keys...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!hasKeys && (
        <div className="bg-yellow-100 p-4 rounded-md mb-4">
          <p className="text-yellow-800 font-medium mb-2">Encryption keys needed</p>
          <p className="text-yellow-700 text-sm mb-4">You need encryption keys for secure messaging.</p>
          <Button
            onClick={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                const response = await fetch("/api/users/keypair");
                const data = await response.json();
                setHasKeys(data.hasKeys);
                toast({
                  title: "Success",
                  description: "Encryption keys generated successfully",
                });
              } catch (error) {
                console.error("Failed to generate keys:", error);
                toast({
                  title: "Error",
                  description: "Failed to generate encryption keys",
                  variant: "destructive",
                });
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Encryption Keys"}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Select User:</label>
        <Select onValueChange={setSelectedUserId} value={selectedUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Message:</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          className="h-32"
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading || !hasKeys}>
        {loading ? "Creating..." : "Start Conversation"}
      </Button>
    </form>
  )
}

