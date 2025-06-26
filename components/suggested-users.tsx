"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

interface User {
  id: string
  name: string
  image?: string | null
  isFollowing?: boolean
}

interface SuggestedUsersProps {
  currentUser: any
  suggestedUsers?: User[]
}

export default function SuggestedUsers({ currentUser, suggestedUsers = [] }: SuggestedUsersProps) {
  const [users, setUsers] = useState<User[]>(suggestedUsers || [])
  const { toast } = useToast()

  const handleFollow = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        // Update the local state to reflect the follow action
        setUsers((prevUsers) => prevUsers.map((user) => (user.id === userId ? { ...user, isFollowing: true } : user)))

        toast({
          title: "Success",
          description: "You are now following this user",
        })
      } else {
        const data = await response.json()
        throw new Error(data.message || "Failed to follow user")
      }
    } catch (error) {
      console.error("Follow error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to follow user",
        variant: "destructive",
      })
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        // Update the local state to reflect the unfollow action
        setUsers((prevUsers) => prevUsers.map((user) => (user.id === userId ? { ...user, isFollowing: false } : user)))

        toast({
          title: "Success",
          description: "You have unfollowed this user",
        })
      } else {
        const data = await response.json()
        throw new Error(data.message || "Failed to unfollow user")
      }
    } catch (error) {
      console.error("Unfollow error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unfollow user",
        variant: "destructive",
      })
    }
  }

  if (!users || users.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Suggested Users</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback>
                  {user.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{user.name}</div>
              </div>
            </div>
            <Button 
              size="sm" 
              variant={user.isFollowing ? "outline" : "default"}
              onClick={() => user.isFollowing ? handleUnfollow(user.id) : handleFollow(user.id)}
            >
              {user.isFollowing ? "Unfollow" : "Follow"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

