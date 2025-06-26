"use client"

import { useState, useEffect } from 'react';
import { User, Follow, Product, Post } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, UserPlus, UserMinus, Flag, CheckCircle } from 'lucide-react';
import axios from 'axios';
import ProductGrid from '../product-grid';
import UserPosts from './UserPosts';
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface UserProfileProps {
  userId: string;
  onClose?: () => void;
}

export default function UserProfile({ userId, onClose }: UserProfileProps) {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [hasReported, setHasReported] = useState(false);
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [userResponse, followResponse, productsResponse, postsResponse, reportResponse] = await Promise.all([
          axios.get(`/api/users/${userId}`),
          axios.get(`/api/users/${userId}/follow-status`),
          axios.get(`/api/users/${userId}/products`),
          axios.get(`/api/users/${userId}/posts`),
          axios.get(`/api/users/${userId}/report-status`)
        ]);

        setUser(userResponse.data);
        setIsFollowing(followResponse.data.isFollowing);
        setUserProducts(productsResponse.data);
        setUserPosts(postsResponse.data);
        setHasReported(reportResponse.data.hasReported);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const handleFollow = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to follow/unfollow user")
      }

      const data = await response.json()
      setIsFollowing(data.isFollowing)
      router.refresh()
      toast.success(isFollowing ? "Unfollowed user" : "Following user")
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  };

  const handleMessage = () => {
    router.push(`/messages/${userId}`)
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason for reporting")
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/users/${userId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: reportReason }),
      })

      if (!response.ok) {
        throw new Error("Failed to report user")
      }

      setIsReportDialogOpen(false)
      setReportReason("")
      setHasReported(true)
      toast.success("User reported successfully")
    } catch (error) {
      toast.error("Failed to report user")
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.image || ''} alt={user.name || ''} />
            <AvatarFallback>{user.name?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        {session?.user?.email !== user.email && (
          <div className="flex gap-2">
            <Button
              variant={isFollowing ? "outline" : "default"}
              onClick={handleFollow}
              disabled={isLoading}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Follow
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMessage}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
            {hasReported ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-red-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Reported
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReportDialogOpen(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
          </TabsList>
          <TabsContent value="posts">
            <UserPosts posts={userPosts} />
          </TabsContent>
          <TabsContent value="listings">
            <ProductGrid products={userProducts} />
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Please provide a reason for reporting this user. This will be reviewed by our moderation team.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter your reason for reporting..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReportDialogOpen(false)
                setReportReason("")
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReport}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 