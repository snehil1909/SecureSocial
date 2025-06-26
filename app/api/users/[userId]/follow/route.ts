import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return new NextResponse('User not found', { status: 404 })
    }

    const targetUserId = params.userId

    // Cannot follow yourself
    if (currentUser.id === targetUserId) {
      return new NextResponse('Cannot follow yourself', { status: 400 })
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return new NextResponse('Target user not found', { status: 404 })
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: targetUserId
        }
      }
    })

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: targetUserId
          }
        }
      })
      return NextResponse.json({ isFollowing: false })
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId: currentUser.id,
          followingId: targetUserId
        }
      })
      return NextResponse.json({ isFollowing: true })
    }
  } catch (error) {
    console.error('Error following/unfollowing user:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { userId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = session.user.id
    const targetUserId = params.userId

    // Delete follow relationship
    await prisma.follow.deleteMany({
      where: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    })

    return NextResponse.json({ message: "Unfollowed successfully" })
  } catch (error) {
    console.error("Unfollow user error:", error)
    return NextResponse.json({ message: "An error occurred while unfollowing the user" }, { status: 500 })
  }
}

