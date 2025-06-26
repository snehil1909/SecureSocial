import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get("cursor")
    const limit = 20

    // Get notifications
    const notifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
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
    if (notifications.length === limit) {
      nextCursor = notifications[notifications.length - 1].id
    }

    return NextResponse.json({
      notifications,
      nextCursor,
    })
  } catch (error) {
    console.error("Get notifications error:", error)
    return NextResponse.json({ message: "An error occurred while fetching notifications" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ message: "Notification IDs are required" }, { status: 400 })
    }

    // Mark notifications as read
    await db.notification.updateMany({
      where: {
        id: {
          in: ids,
        },
        userId: session.user.id,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json({ message: "Notifications marked as read" })
  } catch (error) {
    console.error("Update notifications error:", error)
    return NextResponse.json({ message: "An error occurred while updating notifications" }, { status: 500 })
  }
}

