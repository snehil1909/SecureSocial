import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary"
import { logSecurityEvent } from "@/lib/security-logger"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get the form data
    const formData = await req.formData()
    const file = formData.get("file") as File
    const fileType = formData.get("type") as string

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 })
    }

    // Log file details
    console.log(`Processing ${fileType || 'unknown'} file upload: ${file.name}, size: ${file.size}, type: ${file.type}`)

    // Convert File to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log(`File converted to buffer, size: ${buffer.length} bytes`)

    // Upload to Cloudinary
    console.log(`Uploading to Cloudinary...`)
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "posts",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error)
            reject(error)
          } else {
            console.log(`Cloudinary upload success: ${result?.secure_url?.substring(0, 50)}...`)
            resolve(result)
          }
        }
      )

      // Convert buffer to stream and pipe to cloudinary
      const bufferStream = require("stream").Readable.from(buffer)
      bufferStream.pipe(uploadStream)
    })

    // Return the URL of the uploaded file
    console.log(`File upload complete, returning URL`)
    return NextResponse.json({ 
      url: (result as any).secure_url,
      secure_url: (result as any).secure_url 
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { message: "An error occurred while uploading the file" },
      { status: 500 }
    )
  }
}

