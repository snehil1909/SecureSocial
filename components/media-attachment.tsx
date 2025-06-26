"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { File, Image, Video, FileAudio, X, Download, ExternalLink } from "lucide-react"

interface MediaAttachmentProps {
  type: string
  url: string
  name?: string
  size?: number
  onRemove?: () => void
  showRemove?: boolean
}

export default function MediaAttachment({ type, url, name, size, onRemove, showRemove = false }: MediaAttachmentProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // Check if URL is valid
  const isValidUrl = url && (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:'));
  
  // Try to extract URL from gibberish text (for backwards compatibility)
  let safeUrl = isValidUrl ? url : (type === 'image' ? '/placeholder.svg' : '');
  let extractedUrl = null;
  
  // Try to find a URL pattern in the gibberish text
  if (!isValidUrl && type === 'image' && url) {
    // Check for http/https URL patterns in the text
    const urlMatch = url.match(/(https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp))/i);
    if (urlMatch) {
      extractedUrl = urlMatch[0];
      safeUrl = extractedUrl;
      console.log(`Extracted URL from gibberish text: ${extractedUrl?.substring(0, 50)}...`);
    } else if (url.includes('cloudinary.com')) {
      // Try to extract cloudinary URLs specifically
      const cloudinaryMatch = url.match(/(https?:\/\/\w+\.cloudinary\.com\/[^\s"']+)/i);
      if (cloudinaryMatch) {
        extractedUrl = cloudinaryMatch[0];
        safeUrl = extractedUrl;
        console.log(`Extracted Cloudinary URL: ${extractedUrl?.substring(0, 50)}...`);
      }
    } else if (url.includes('res.cloudinary.com')) {
      // Another common Cloudinary URL pattern
      const cloudinaryResMatch = url.match(/(https?:\/\/res\.cloudinary\.com\/[^\s"']+)/i);
      if (cloudinaryResMatch) {
        extractedUrl = cloudinaryResMatch[0];
        safeUrl = extractedUrl;
        console.log(`Extracted Cloudinary res URL: ${extractedUrl?.substring(0, 50)}...`);
      }
    }
    
    // Special handling for broken URLs (e.g., if the URL is truncated)
    if (!extractedUrl && url.includes('http')) {
      // Try to find any URL-like pattern
      const anyUrlMatch = url.match(/(https?:\/\/\S+)/i);
      if (anyUrlMatch) {
        extractedUrl = anyUrlMatch[0];
        safeUrl = extractedUrl;
        console.log(`Extracted partial URL: ${extractedUrl?.substring(0, 50)}...`);
      }
    }
  }
  
  // Add console logging for debugging
  console.log(`MediaAttachment: ${type} with URL length: ${url?.length || 0}, valid: ${isValidUrl}, extracted: ${extractedUrl ? 'yes' : 'no'}`);
  
  // Log any obvious base64 format issues for image data URLs
  if (url && url.startsWith('data:image') && !url.includes(';base64,')) {
    console.error('Malformed image data URL detected - missing base64 encoding format');
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getIcon = () => {
    switch (type) {
      case "image":
        return <Image className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <FileAudio className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const renderPreview = () => {
    switch (type) {
      case "image":
        return (
          <div className="relative">
            {imageError || (!isValidUrl && !extractedUrl) ? (
              <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded">
                <p className="text-lg font-medium mb-2">Image could not be displayed</p>
                {extractedUrl ? (
                  <>
                    <p className="text-sm text-green-600 mb-4">Found image URL in text</p>
                    <Button asChild variant="outline">
                      <a href={extractedUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open extracted image
                      </a>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">
                    URL: {url ? (url.length > 50 ? url.substring(0, 50) + '...' : url) : 'Missing URL'}
                  </p>
                )}
                {(isValidUrl || extractedUrl) && (
                  <Button asChild variant="outline">
                    <a href={safeUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in new tab
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <img
                  src={safeUrl}
                  alt={name || "Image"}
                  className="max-w-full max-h-[80vh] object-contain"
                  onError={(e) => {
                    console.error(`Error loading image: ${safeUrl.substring(0, 50)}...`);
                    setImageError(true);
                  }}
                />
                <Button asChild variant="outline" className="mt-2">
                  <a href={safeUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open image in new tab
                  </a>
                </Button>
              </div>
            )}
          </div>
        )
      case "video":
        return (
          <video controls className="max-w-full max-h-[80vh]">
            <source src={url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )
      case "audio":
        return (
          <audio controls className="w-full">
            <source src={url} type="audio/mpeg" />
            Your browser does not support the audio tag.
          </audio>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <File className="h-16 w-16 mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">{name || "Document"}</p>
            <div className="flex space-x-4">
              <Button asChild variant="outline">
                <a href={url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </a>
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="relative group">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div 
            className="border rounded-md p-2 flex items-center space-x-2 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={(e) => {
              // For images with valid URLs, we'll allow directly opening in a new tab with Ctrl/Cmd click
              if (type === 'image' && (isValidUrl || extractedUrl) && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                e.stopPropagation();
                window.open(safeUrl, '_blank');
                return;
              }
            }}
          >
            {type === "image" ? (
              <div className="h-10 w-10 rounded-md overflow-hidden relative">
                <img 
                  src={safeUrl} 
                  alt={name || "Image"} 
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.error(`Error loading thumbnail image: ${safeUrl.substring(0, 50)}...`);
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }} 
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 flex items-center justify-center">
                  <ExternalLink className="h-4 w-4 text-transparent hover:text-white" />
                </div>
              </div>
            ) : (
              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">{getIcon()}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {extractedUrl ? "Image (URL Extracted)" : 
                  (name || (type === "image" ? "Image" : type === "video" ? "Video" : type === "audio" ? "Audio" : "Document"))}
              </p>
              {size && <p className="text-xs text-muted-foreground">{formatSize(size)}</p>}
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-4xl w-full p-0" disableFullScreenMobile>
          <DialogTitle className="sr-only">
            {name || (type === "image" ? "Image" : type === "video" ? "Video" : type === "audio" ? "Audio" : "Document")}
          </DialogTitle>
          <div className="p-6">{renderPreview()}</div>
        </DialogContent>
      </Dialog>

      {showRemove && onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

