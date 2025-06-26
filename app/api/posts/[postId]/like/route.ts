import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const postId = params.postId

    // Check if post exists
    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
    })

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 })
    }

    // Check if already liked
    const existingLike = await db.like.findFirst({
      where: {
        postId,
        userId: session.user.id,
      },
    })

    if (existingLike) {
      return NextResponse.json({ message: "Post already liked" }, { status: 409 })
    }

    // Create like
    const like = await db.like.create({
      data: {
        postId,
        userId: session.user.id,
      },
    })

    // Create notification if the post is not by the current user
    if (post.authorId !== session.user.id) {
      await db.notification.create({
        data: {
          userId: post.authorId,
          type: "POST_LIKED",
          content: `${session.user.name} liked your post`,
          referenceId: postId,
        },
      })
    }

    return NextResponse.json(like, { status: 201 })
  } catch (error) {
    console.error("Like post error:", error)
    return NextResponse.json({ message: "An error occurred while liking the post" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const postId = params.postId

    // Delete like
    await db.like.deleteMany({
      where: {
        postId,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Post unliked successfully" })
  } catch (error) {
    console.error("Unlike post error:", error)
    return NextResponse.json({ message: "An error occurred while unliking the post" }, { status: 500 })
  }
}

