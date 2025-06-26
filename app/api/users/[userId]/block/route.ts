import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logSecurityEvent } from "@/lib/security-logger"

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = session.user.id
    const { userId: targetUserId } = await Promise.resolve(params)

    // Cannot block yourself
    if (currentUserId === targetUserId) {
      return NextResponse.json({ message: "You cannot block yourself" }, { status: 400 })
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: {
        id: targetUserId,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Create a report for the blocked user
    const report = await db.report.create({
      data: {
        type: "USER",
        reason: "User blocked",
        reporterId: currentUserId,
        reportedUserId: targetUserId,
        status: "RESOLVED",
      },
    })

    // Remove any follow relationships
    await db.follow.deleteMany({
      where: {
        OR: [
          { followerId: currentUserId, followingId: targetUserId },
          { followerId: targetUserId, followingId: currentUserId },
        ],
      },
    })

    // Log the block action
    await logSecurityEvent({
      eventType: "USER_BLOCKED",
      userId: currentUserId,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        blockedUserId: targetUserId,
        reportId: report.id,
      },
      severity: "MEDIUM",
    })

    return NextResponse.json({ isBlocked: true, message: "User blocked successfully" }, { status: 200 })
  } catch (error) {
    console.error("Block user error:", error)
    return NextResponse.json({ message: "An error occurred while blocking the user" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { userId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = session.user.id
    const { userId: targetUserId } = await Promise.resolve(params)

    // Find block report only where the current user is the one who blocked
    const report = await db.report.findFirst({
      where: {
        type: "USER",
        status: "RESOLVED",
        reporterId: currentUserId,
        reportedUserId: targetUserId,
      },
    })

    if (!report) {
      return NextResponse.json({ message: "You cannot unblock this user as you did not block them" }, { status: 403 })
    }

    // Delete the block report
    await db.report.delete({
      where: {
        id: report.id,
      },
    })

    // Log the unblock action
    await logSecurityEvent({
      eventType: "USER_UNBLOCKED",
      userId: currentUserId,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        unblockedUserId: targetUserId,
        reportId: report.id,
      },
      severity: "MEDIUM",
    })

    return NextResponse.json({ isBlocked: false, message: "User unblocked successfully" }, { status: 200 })
  } catch (error) {
    console.error("Unblock user error:", error)
    return NextResponse.json({ message: "An error occurred while unblocking the user" }, { status: 500 })
  }
}

