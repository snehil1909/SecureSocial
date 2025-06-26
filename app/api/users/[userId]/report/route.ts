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

    const body = await req.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json({ message: "Reason is required" }, { status: 400 })
    }

    const currentUserId = session.user.id
    const targetUserId = params.userId

    // Cannot report yourself
    if (currentUserId === targetUserId) {
      return NextResponse.json({ message: "You cannot report yourself" }, { status: 400 })
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

    // Check if user has already reported this user
    const existingReport = await db.report.findFirst({
      where: {
        type: "USER",
        reporterId: currentUserId,
        reportedUserId: targetUserId,
      },
    })

    if (existingReport) {
      return NextResponse.json(
        { message: "You have already reported this user" },
        { status: 400 }
      )
    }

    // Create report
    const report = await db.report.create({
      data: {
        type: "USER",
        reason,
        reporterId: currentUserId,
        reportedUserId: targetUserId,
        status: "PENDING",
      },
    })

    // Log the report
    await logSecurityEvent({
      eventType: "USER_REPORTED",
      userId: currentUserId,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        reportedUserId: targetUserId,
        reason,
        reportId: report.id,
      },
      severity: "MEDIUM",
    })

    return NextResponse.json(
      { message: "User reported successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Report user error:", error)
    return NextResponse.json(
      { message: "An error occurred while reporting the user" },
      { status: 500 }
    )
  }
}

