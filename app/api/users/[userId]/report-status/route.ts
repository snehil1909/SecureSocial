import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = session.user.id
    const targetUserId = params.userId

    // Check if the user has already reported the target user
    const report = await db.report.findFirst({
      where: {
        type: "USER",
        reporterId: currentUserId,
        reportedUserId: targetUserId,
      },
    })

    return NextResponse.json({ hasReported: !!report })
  } catch (error) {
    console.error("Get report status error:", error)
    return NextResponse.json(
      { message: "An error occurred while checking report status" },
      { status: 500 }
    )
  }
} 