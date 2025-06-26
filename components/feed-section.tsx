"use client"

import { useState } from "react"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageCircle, Heart, Share } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "next-auth/react"
import type { Post } from "@/types"

interface FeedSectionProps {
  initialPosts: Post[]
}

export default function FeedSection({ initialPosts }: FeedSectionProps) {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({})
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({})

  const handleLike = async (postId: string) => {
    if (!session?.user?.id) return

    try {
      const isLiked = posts.find(p => p.id === postId)?.likes.some(like => like.userId === session.user.id)
      const method = isLiked ? 'DELETE' : 'POST'
      
      const response = await fetch(`/api/posts/${postId}/like`, {
        method,
      })

      if (!response.ok) throw new Error('Failed to like post')

      setPosts(currentPosts =>
        currentPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                likes: isLiked
                  ? post.likes.filter(like => like.userId !== session.user.id)
                  : [...post.likes, { userId: session.user.id }],
                _count: {
                  ...post._count,
                  likes: isLiked ? post._count.likes - 1 : post._count.likes + 1,
                },
              }
            : post
        )
      )
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const handleComment = async (postId: string) => {
    if (!session?.user?.id || !commentText[postId]?.trim()) return

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: commentText[postId] }),
      })

      if (!response.ok) throw new Error('Failed to add comment')

      const newComment = await response.json()

      setPosts(currentPosts =>
        currentPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                comments: [...post.comments, newComment],
                _count: {
                  ...post._count,
                  comments: post._count.comments + 1,
                },
              }
            : post
        )
      )

      // Clear comment input
      setCommentText(prev => ({ ...prev, [postId]: '' }))
    } catch (error) {
      console.error('Error commenting on post:', error)
    }
  }

  const toggleComments = (postId: string) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-2">Welcome to your feed!</h2>
        <p className="text-muted-foreground mb-6">
          Be the first to create a post and start the conversation.
        </p>
        <Button>Create Post</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Posts</h2>
        <Button>Create Post</Button>
      </div>

      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar>
              <AvatarImage src={post.author.image || "/placeholder.svg"} alt={post.author.name || ""} />
              <AvatarFallback>
                {(post.author.name || "")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{post.author.name || "Anonymous"}</div>
              <div className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{post.content}</p>
            {post.image && (
              <div className="rounded-md overflow-hidden">
                <img src={post.image} alt="Post image" className="w-full h-auto object-cover" />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="w-full border-t border-border pt-4 flex justify-between">
              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex items-center gap-1 ${
                    post.likes.some(like => like.userId === session?.user?.id) ? 'text-red-500' : ''
                  }`}
                  onClick={() => handleLike(post.id)}
                >
                  <Heart className="h-4 w-4" />
                  <span>{post._count.likes}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => toggleComments(post.id)}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{post._count.comments}</span>
                </Button>
              </div>
              <Button variant="ghost" size="sm">
                <Share className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>

            {showComments[post.id] && (
              <div className="w-full space-y-4">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.author.image || "/placeholder.svg"} alt={comment.author.name || ""} />
                      <AvatarFallback>
                        {(comment.author.name || "")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted p-2 rounded-md">
                      <div className="font-semibold text-sm">{comment.author.name || "Anonymous"}</div>
                      <div className="text-sm">{comment.content}</div>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={commentText[post.id] || ''}
                    onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                    className="min-h-[60px]"
                  />
                  <Button onClick={() => handleComment(post.id)}>Post</Button>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

