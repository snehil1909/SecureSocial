"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ImageUpload } from "@/components/image-upload"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { KeyRound, AlertCircle, Wallet, CreditCard } from "lucide-react"
import { GenerateKeysButton } from "@/components/generate-keys-button"
import { formatCurrency } from "@/lib/utils"

interface ProfileFormProps {
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
    balance?: number
    publicKey?: string | null
    encryptedPrivateKey?: string | null
  }
  followersCount: number
  followingCount: number
}

export default function ProfileForm({ user, followersCount, followingCount }: ProfileFormProps) {
  const { data: session, update } = useSession()
  const [name, setName] = useState(user.name || "")
  const [avatar, setAvatar] = useState<string[]>(user.image ? [user.image] : [])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/user/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          image: avatar[0] || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      // Update the session to reflect the new avatar
      await update()

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Update your personal details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-3 sm:items-start sm:flex-row sm:space-y-0 sm:space-x-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatar[0] || ""} alt={name || "User"} />
            <AvatarFallback className="text-lg">
              {name
                ? name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-2">
            <h3 className="font-medium">{name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex space-x-4 mt-2">
              <div className="text-center">
                <div className="font-semibold">{followersCount}</div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{followingCount}</div>
                <div className="text-sm text-muted-foreground">Following</div>
              </div>
            </div>
            <div className="w-full">
              <ImageUpload
                value={avatar}
                onChange={setAvatar}
                disabled={isLoading}
                maxFiles={1}
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" value={user.email || ""} disabled />
            <p className="text-xs text-muted-foreground">
              Your email address is used for sign-in and cannot be changed.
            </p>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save changes"}
          </Button>
        </form>

        <Separator className="my-6" />

        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-800">Wallet Balance</h3>
                <p className="text-sm text-blue-600">Available funds for transactions</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-700">{formatCurrency(user.balance || 0)}</div>
              <div className="flex items-center text-xs text-blue-500 mt-1">
                <CreditCard className="h-3 w-3 mr-1" />
                <span>FCS Marketplace</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Security & Encryption</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your encryption keys for secure messaging
          </p>
          
          {!user.publicKey || !user.encryptedPrivateKey ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-800 mb-1">No Encryption Keys</h4>
                  <p className="text-amber-700 text-sm mb-3">
                    You need encryption keys to send and receive secure messages.
                  </p>
                  <GenerateKeysButton variant="secondary" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <KeyRound className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-800 mb-1">Encryption Keys Active</h4>
                  <p className="text-green-700 text-sm">
                    Your encryption keys are set up and you can participate in secure messaging.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 