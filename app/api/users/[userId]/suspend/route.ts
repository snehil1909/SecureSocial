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

    // Check if the current user is an admin
    const currentUser = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
    })

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Only admins can suspend users" },
        { status: 403 }
      )
    }

    const targetUserId = params.userId

    // Cannot suspend yourself
    if (currentUser.id === targetUserId) {
      return NextResponse.json(
        { message: "You cannot suspend yourself" },
        { status: 400 }
      )
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

    // Update user status to SUSPENDED
    await db.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        status: "SUSPENDED",
      },
    })

    // Log the suspension
    await logSecurityEvent({
      eventType: "USER_SUSPENDED",
      userId: currentUser.id,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        suspendedUserId: targetUserId,
      },
      severity: "HIGH",
    })

    return NextResponse.json(
      { message: "User suspended successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Suspend user error:", error)
    return NextResponse.json(
      { message: "An error occurred while suspending the user" },
      { status: 500 }
    )
  }
} 