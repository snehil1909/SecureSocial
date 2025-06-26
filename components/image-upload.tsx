"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface ImageUploadProps {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
  maxFiles?: number
}

export function ImageUpload({ value, onChange, disabled, maxFiles = 1 }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return

      // Check if adding these files would exceed the max
      if (value.length + acceptedFiles.length > maxFiles) {
        toast({
          title: "Too many files",
          description: `You can only upload a maximum of ${maxFiles} files`,
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)

      try {
        // In a real app, you would upload to a storage service
        // For this demo, we'll simulate uploads with base64
        const uploadedUrls = await Promise.all(
          acceptedFiles.map(async (file) => {
            return new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => {
                // In a real app, this would be the URL returned from your upload service
                resolve(reader.result as string)
              }
              reader.readAsDataURL(file)
            })
          }),
        )

        onChange([...value, ...uploadedUrls])
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "There was an error uploading your images",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    },
    [value, onChange, disabled, maxFiles, toast],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    disabled: disabled || isUploading || value.length >= maxFiles,
    maxFiles,
  })

  const removeImage = (index: number) => {
    const newValue = [...value]
    newValue.splice(index, 1)
    onChange(newValue)
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-md p-6 text-center cursor-pointer
          ${isDragActive ? "border-primary bg-primary/10" : "border-border"}
          ${disabled || isUploading || value.length >= maxFiles ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive ? "Drop the files here" : `Drag & drop images here, or click to select`}
          </p>
          <p className="text-xs text-muted-foreground">
            {value.length} / {maxFiles} images uploaded
          </p>
        </div>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url || "/placeholder.svg"}
                alt={`Uploaded ${index + 1}`}
                className="w-full h-32 object-cover rounded-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
                disabled={disabled || isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

