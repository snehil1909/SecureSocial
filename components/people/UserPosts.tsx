import { useState } from 'react';
import { Post } from '@prisma/client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Heart, Share } from "lucide-react";

interface UserPostsProps {
  posts: Post[];
}

export default function UserPosts({ posts }: UserPostsProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div>
              <div className="text-sm text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{post.content}</p>
            {post.image && (
              <div className="rounded-md overflow-hidden">
                <img 
                  src={post.image} 
                  alt="Post image" 
                  className="w-full h-auto object-cover" 
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-border pt-4 flex justify-between">
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm">
              <Share className="h-4 w-4 mr-1" />
              Share
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 