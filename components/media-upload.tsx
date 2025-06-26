"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Loader2, Upload, Image, FileVideo, FileAudio, File } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import MediaAttachment from "@/components/media-attachment"

interface MediaUploadProps {
  onUpload: (files: { type: string; url: string; name: string; size: number }[]) => void
  maxFiles?: number
  allowedTypes?: string[]
  disabled?: boolean
}

export default function MediaUpload({
  onUpload,
  maxFiles = 5,
  allowedTypes = [
    "image/*",
    "video/*",
    "audio/*",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  disabled = false,
}: MediaUploadProps) {
  const [files, setFiles] = useState<{ type: string; url: string; name: string; size: number }[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    // Determine file type category
    let type = "document"
    if (file.type.startsWith("image/")) type = "image"
    else if (file.type.startsWith("video/")) type = "video"
    else if (file.type.startsWith("audio/")) type = "audio"

    formData.append("type", type)

    try {
      console.log(`Uploading ${type} file: ${file.name}, size: ${file.size}, MIME type: ${file.type}`);
      
      // For large files, increase timeout
      const timeoutMs = Math.max(30000, file.size / 1024);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Upload failed with status ${response.status}: ${errorText}`);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Upload response received with status ${response.status}`);
      
      // Make sure we have a valid URL
      if (!data.url && !data.secure_url) {
        console.error("Upload succeeded but no URL returned");
        throw new Error("No URL returned from upload");
      }
      
      const uploadedFile = {
        type,
        url: data.url || data.secure_url, // Accept either url property
        name: file.name,
        size: file.size,
      };
      
      console.log(`Successful upload: ${type}, URL length: ${uploadedFile.url.length} chars`);
      return uploadedFile;
    } catch (error) {
      console.error(`Upload error for ${file.name}:`, error);
      throw error;
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return

      // Check if adding these files would exceed the max
      if (files.length + acceptedFiles.length > maxFiles) {
        toast({
          title: "Too many files",
          description: `You can only upload a maximum of ${maxFiles} files`,
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)

      try {
        const uploadPromises = acceptedFiles.map(uploadFile)
        const uploadedFiles = await Promise.all(uploadPromises)

        const newFiles = [...files, ...uploadedFiles]
        setFiles(newFiles)
        onUpload(newFiles)

        toast({
          title: "Files uploaded",
          description: `Successfully uploaded ${acceptedFiles.length} file(s)`,
        })
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "There was an error uploading your files",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    },
    [files, maxFiles, disabled, toast, onUpload],
  )

  const removeFile = (index: number) => {
    const newFiles = [...files]
    newFiles.splice(index, 1)
    setFiles(newFiles)
    onUpload(newFiles)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedTypes.reduce(
      (acc, type) => {
        acc[type] = []
        return acc
      },
      {} as Record<string, string[]>,
    ),
    disabled: disabled || isUploading || files.length >= maxFiles,
    maxFiles: maxFiles - files.length,
  })

  const getIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-6 w-6" />
      case "video":
        return <FileVideo className="h-6 w-6" />
      case "audio":
        return <FileAudio className="h-6 w-6" />
      default:
        return <File className="h-6 w-6" />
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-md p-4 text-center cursor-pointer
          ${isDragActive ? "border-primary bg-primary/10" : "border-border"}
          ${disabled || isUploading || files.length >= maxFiles ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm font-medium">
            {isUploading
              ? "Uploading..."
              : isDragActive
                ? "Drop the files here"
                : `Drag & drop files here, or click to select`}
          </p>
          <p className="text-xs text-muted-foreground">
            {files.length} / {maxFiles} files uploaded
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <MediaAttachment
              key={index}
              type={file.type}
              url={file.url}
              name={file.name}
              size={file.size}
              onRemove={() => removeFile(index)}
              showRemove={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}

