import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { sanitizeInput } from "@/lib/utils"

export async function GET(req: Request, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const postId = params.postId
    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get("cursor")
    const limit = 10

    // Check if post exists
    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
    })

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 })
    }

    // Get comments
    const comments = await db.comment.findMany({
      where: {
        postId,
      },
      include: {
        author: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
    })

    let nextCursor = null
    if (comments.length === limit) {
      nextCursor = comments[comments.length - 1].id
    }

    return NextResponse.json({
      comments,
      nextCursor,
    })
  } catch (error) {
    console.error("Get comments error:", error)
    return NextResponse.json({ message: "An error occurred while fetching comments" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const postId = params.postId
    const body = await req.json()
    let { content } = body

    if (!content) {
      return NextResponse.json({ message: "Content is required" }, { status: 400 })
    }

    // Sanitize content to prevent XSS
    content = sanitizeInput(content)

    // Check if post exists
    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
    })

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 })
    }

    // Create comment
    const comment = await db.comment.create({
      data: {
        content,
        postId,
        authorId: session.user.id,
      },
      include: {
        author: true,
      },
    })

    // Create notification if the post is not by the current user
    if (post.authorId !== session.user.id) {
      await db.notification.create({
        data: {
          userId: post.authorId,
          type: "POST_COMMENTED",
          content: `${session.user.name} commented on your post`,
          referenceId: postId,
        },
      })
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Create comment error:", error)
    return NextResponse.json({ message: "An error occurred while creating the comment" }, { status: 500 })
  }
}

