"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Search, X, Users, UserPlus, Shield, Settings, LogOut, UserMinus, Crown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/spinner"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  hasKeys?: boolean
  role?: string
}

interface GroupChatSettingsProps {
  currentUserId: string
  conversation: {
    id: string
    name: string | null
    isGroup: boolean
    image?: string | null
    participants: {
      userId: string
      role: string
      user: User
    }[]
    adminIds: string[]
    creatorId: string
  }
}

export default function GroupChatSettings({ currentUserId, conversation }: GroupChatSettingsProps) {
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false)
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false)
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  const { toast } = useToast()
  const router = useRouter()

  const isCurrentUserAdmin = conversation.adminIds.includes(currentUserId) || 
                             conversation.participants.some(p => 
                               p.userId === currentUserId && (p.role === "ADMIN" || p.role === "OWNER")
                             )
  
  const currentUserRole = conversation.participants.find(p => p.userId === currentUserId)?.role || "MEMBER"
  const isOwner = currentUserRole === "OWNER" || conversation.creatorId === currentUserId

  // Function to search for users
  const searchUsers = async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error("Failed to search users")
      }
      
      const data = await response.json()
      
      // Filter out current user and existing participants
      const existingParticipantIds = conversation.participants.map(p => p.userId)
      const filteredResults = data.users
        .filter((user: User) => !existingParticipantIds.includes(user.id))
      
      setSearchResults(filteredResults)
    } catch (error) {
      console.error("Error searching users:", error)
      toast({
        title: "Error",
        description: "Failed to search for users",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search when query changes - reduced debounce time for more responsiveness
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery)
    }, 200) // Reduced from 500ms to 200ms for more responsiveness

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Select a user
  const selectUser = (user: User) => {
    if (!user.hasKeys) {
      toast({
        title: "Cannot add user",
        description: "This user doesn't have encryption keys set up and cannot be added to secure chats.",
        variant: "destructive",
      })
      return
    }
    
    setSelectedUsers([...selectedUsers, user])
    setSearchResults(searchResults.filter(u => u.id !== user.id))
    setSearchQuery("")
  }

  // Remove a selected user
  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId))
  }

  // Add members to the group
  const addMembers = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user to add to the group",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/conversations/group", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          userIds: selectedUsers.map(user => user.id)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add members")
      }

      toast({
        title: "Members added",
        description: `Added ${selectedUsers.length} new member(s) to the group`,
      })

      // Close dialog and reset form
      setIsAddMembersOpen(false)
      setSelectedUsers([])
      setSearchQuery("")
      setSearchResults([])
      
      // Refresh the page to show updated group
      router.refresh()
    } catch (error: any) {
      console.error("Error adding members:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add members",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Change role (promote to admin or demote to member)
  const changeRole = async (userId: string, newRole: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/conversations/group/permissions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          userId,
          role: newRole
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to change role")
      }

      toast({
        title: "Role updated",
        description: `User is now a ${newRole.toLowerCase()}`,
      })
      
      // Refresh the page to show updated roles
      router.refresh()
    } catch (error: any) {
      console.error("Error changing role:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to change role",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Remove a member
  const removeMember = async (userId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/conversations/group/permissions?conversationId=${conversation.id}&userId=${userId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove member")
      }

      toast({
        title: "Member removed",
        description: "User has been removed from the group",
      })
      
      // Refresh the page to show updated members
      router.refresh()
    } catch (error: any) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Leave the group
  const leaveGroup = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/conversations/group/permissions?conversationId=${conversation.id}&userId=${currentUserId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to leave group")
      }

      toast({
        title: "Left group",
        description: "You have left the group chat",
      })
      
      // Navigate back to messages
      router.push("/messages")
      router.refresh()
    } catch (error: any) {
      console.error("Error leaving group:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to leave group",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Group settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => setIsViewMembersOpen(true)}
            className="cursor-pointer"
          >
            <Users className="h-4 w-4 mr-2" />
            View members ({conversation.participants.length})
          </DropdownMenuItem>
          
          {isCurrentUserAdmin && (
            <DropdownMenuItem 
              onClick={() => setIsAddMembersOpen(true)}
              className="cursor-pointer"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add members
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setIsLeaveDialogOpen(true)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Leave group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Members Dialog */}
      <Dialog open={isAddMembersOpen} onOpenChange={setIsAddMembersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
            <DialogDescription>
              Add new members to the group chat. They will have access to all messages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Users</Label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map(user => (
                    <Badge key={user.id} variant="secondary" className="gap-1 pl-1">
                      <Avatar className="h-5 w-5 mr-1">
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                        <AvatarFallback>{(user.name || user.email)[0]}</AvatarFallback>
                      </Avatar>
                      {user.name || user.email}
                      <button 
                        type="button"
                        onClick={() => removeUser(user.id)}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        disabled={isLoading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search results */}
              {isSearching ? (
                <div className="flex justify-center p-2">
                  <Spinner />
                </div>
              ) : (
                searchResults.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {searchResults.map(user => (
                      <div
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                          <AvatarFallback>{(user.name || user.email)[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || "User"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        {!user.hasKeys && (
                          <div className="flex items-center text-amber-500 text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            No keys
                          </div>
                        )}
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          <DialogFooter className="flex space-x-2 sm:justify-between">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setIsAddMembersOpen(false)
                setSelectedUsers([])
                setSearchQuery("")
                setSearchResults([])
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={addMembers} 
              disabled={isLoading || selectedUsers.length === 0}
            >
              {isLoading ? <Spinner className="mr-2" /> : null}
              Add to Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Members Dialog */}
      <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
            <DialogDescription>
              {conversation.participants.length} members in this group
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="border rounded-md max-h-72 overflow-y-auto">
              {conversation.participants.map(participant => (
                <div key={participant.userId} className="flex items-center justify-between gap-2 p-2 hover:bg-muted border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.user.image || undefined} alt={participant.user.name || "User"} />
                      <AvatarFallback>{(participant.user.name || participant.user.email)[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium truncate mr-2">
                          {participant.user.name || "User"}
                          {participant.userId === currentUserId && " (You)"}
                        </p>
                        {participant.role === "OWNER" && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Owner
                          </Badge>
                        )}
                        {participant.role === "ADMIN" && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{participant.user.email}</p>
                    </div>
                  </div>

                  {/* Admin actions for other members */}
                  {isCurrentUserAdmin && participant.userId !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Settings className="h-4 w-4" />
                          <span className="sr-only">Member settings</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Only owner can change admin roles, or admins can promote regular members */}
                        {((isOwner && participant.role === "ADMIN") || 
                          (isCurrentUserAdmin && participant.role === "MEMBER")) && (
                          <DropdownMenuItem
                            onClick={() => changeRole(
                              participant.userId, 
                              participant.role === "ADMIN" ? "MEMBER" : "ADMIN"
                            )}
                            className="cursor-pointer"
                          >
                            {participant.role === "ADMIN" ? (
                              <>
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove as admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Make admin
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        
                        {/* Can't remove owner */}
                        {participant.role !== "OWNER" && (
                          <DropdownMenuItem
                            onClick={() => removeMember(participant.userId)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove from group
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setIsViewMembersOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Group Dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this group chat? You won't be able to see any messages or rejoin unless added by an admin.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex space-x-2 sm:justify-between">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setIsLeaveDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={leaveGroup} 
              disabled={isLoading}
            >
              {isLoading ? <Spinner className="mr-2" /> : null}
              Leave Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 