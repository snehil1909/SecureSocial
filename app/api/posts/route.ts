import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { sanitizeInput } from "@/lib/utils"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const cursor = searchParams.get("cursor")
    const followingOnly = searchParams.get("followingOnly") === "true"
    const limit = 10

    let posts

    if (userId) {
      // Get posts from a specific user
      posts = await db.post.findMany({
        where: {
          authorId: userId,
        },
        include: {
          author: true,
          likes: true,
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
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
    } else if (followingOnly) {
      // Get posts from users that the current user follows and their own posts
      const user = await db.user.findUnique({
        where: {
          id: session.user.id,
        },
        include: {
          following: true,
        },
      })

      if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 404 })
      }

      const followingIds = user.following.map((follow) => follow.followingId)

      posts = await db.post.findMany({
        where: {
          OR: [
            {
              authorId: {
                in: followingIds,
              },
            },
            {
              authorId: session.user.id,
            },
          ],
        },
        include: {
          author: true,
          likes: true,
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
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
    } else {
      // Get all posts
      posts = await db.post.findMany({
        include: {
          author: true,
          likes: true,
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
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
    }

    let nextCursor = null
    if (posts.length === limit) {
      nextCursor = posts[posts.length - 1].id
    }

    return NextResponse.json({
      posts,
      nextCursor,
    })
  } catch (error) {
    console.error("Get posts error:", error)
    return NextResponse.json({ message: "An error occurred while fetching posts" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    let { content, image } = body

    if (!content && !image) {
      return NextResponse.json({ message: "Content or image is required" }, { status: 400 })
    }

    // Sanitize content to prevent XSS
    try {
      if (content) {
        content = sanitizeInput(content)
      }
    } catch (error) {
      console.error("Content sanitization error:", error)
      // If sanitization fails, reject the content
      return NextResponse.json({ message: "Invalid content provided" }, { status: 400 })
    }

    // Create post
    const post = await db.post.create({
      data: {
        content: content || "",
        image,
        authorId: session.user.id,
      },
      include: {
        author: true,
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error("Create post error:", error)
    return NextResponse.json({ message: "An error occurred while creating the post" }, { status: 500 })
  }
}

