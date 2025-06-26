import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logSecurityEvent } from "@/lib/security-logger"

export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if the current user is an admin
    const currentUser = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
    })

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { status, role } = body

    // Update the user
    const updatedUser = await db.user.update({
      where: {
        id: params.userId,
      },
      data: {
        ...(status && { status }),
        ...(role && { role }),
      },
    })

    // Log the user update
    await logSecurityEvent({
      eventType: "USER_UPDATED_BY_ADMIN",
      userId: session.user.id,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        targetUserId: params.userId,
        changes: { status, role },
      },
      severity: "MEDIUM",
    })

    return NextResponse.json(updatedUser, { status: 200 })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ message: "An error occurred while updating the user" }, { status: 500 })
  }
}

