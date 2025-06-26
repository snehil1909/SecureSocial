"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { ImagePlus, VideoIcon, X } from "lucide-react";
import Image from "next/image";

export default function CreatePost() {
  const [isOpen, setIsOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.split("/")[0];
    if (fileType !== "image" && fileType !== "video") {
      alert("Please select an image or video file");
      return;
    }

    setMediaFile(file);
    setMediaType(fileType as "image" | "video");

    // Create preview URL
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const handleSubmit = async () => {
    if (!caption && !mediaFile) {
      alert("Please add a caption or media");
      return;
    }

    try {
      let imageUrl = null;
      if (mediaFile) {
        // Create FormData and upload the image first
        const formData = new FormData();
        formData.append('file', mediaFile);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload media');
        }
        
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      // Create the post with proper headers and stringified body
      const postData = {
        content: caption,
        image: imageUrl,
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create post');
      }

      // Reset form
      setCaption("");
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      setIsOpen(false);

      // Refresh the page to show the new post
      window.location.reload();
    } catch (error) {
      console.error('Error creating post:', error);
      alert(error instanceof Error ? error.message : 'Failed to create post. Please try again.');
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Create Post</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Post</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="What's on your mind?"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[100px]"
          />
          
          {mediaPreview && (
            <div className="relative">
              <button
                onClick={clearMedia}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 hover:bg-black/70"
              >
                <X className="h-4 w-4 text-white" />
              </button>
              {mediaType === "image" ? (
                <div className="relative h-[200px] w-full">
                  <Image
                    src={mediaPreview}
                    alt="Preview"
                    fill
                    className="rounded-lg object-cover"
                  />
                </div>
              ) : (
                <video
                  src={mediaPreview}
                  className="max-h-[200px] w-full rounded-lg"
                  controls
                />
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              ref={fileInputRef}
            />
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              {mediaType ? "Change Media" : "Add Media"}
              <ImagePlus className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            className="w-full"
          >
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 