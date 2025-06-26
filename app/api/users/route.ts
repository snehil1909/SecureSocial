
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all users except the current user
    const users = await db.user.findMany({
      where: {
        id: {
          not: session.user.id, // Exclude current user
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        followers: {
          where: {
            followerId: session.user.id,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    // Transform the data to include isFollowing flag
    const transformedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      isFollowing: user.followers.length > 0,
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}


