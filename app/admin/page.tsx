import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import AdminDashboard from "@/components/admin/dashboard"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    redirect("/login")
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
  })

  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Get stats for admin dashboard
  const userCount = await db.user.count()
  const activeUserCount = await db.user.count({
    where: {
      status: "ACTIVE",
    },
  })
  const inactiveUserCount = await db.user.count({
    where: {
      status: "INACTIVE",
    },
  })
  const suspendedUserCount = await db.user.count({
    where: {
      status: "SUSPENDED",
    },
  })
  const adminCount = await db.user.count({
    where: {
      role: "ADMIN",
    },
  })

  // Get new user stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)
  lastWeek.setHours(0, 0, 0, 0)

  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  lastMonth.setHours(0, 0, 0, 0)

  const newUsersToday = await db.user.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  })

  const newUsersThisWeek = await db.user.count({
    where: {
      createdAt: {
        gte: lastWeek,
      },
    },
  })

  const newUsersThisMonth = await db.user.count({
    where: {
      createdAt: {
        gte: lastMonth,
      },
    },
  })

  const productCount = await db.product.count()
  const pendingReports = await db.report.count({
    where: {
      status: "PENDING",
    },
  })

  const recentUsers = await db.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  })

  const recentProducts = await db.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      seller: true,
    },
    take: 5,
  })

  return (
    <AdminDashboard
      stats={{
        userCount,
        activeUserCount,
        inactiveUserCount,
        suspendedUserCount,
        adminCount,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        productCount,
        pendingReports,
      }}
      recentUsers={recentUsers}
      recentProducts={recentProducts}
    />
  )
}

