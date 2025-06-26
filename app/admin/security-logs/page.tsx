import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import AdminSecurityLogs from "@/components/admin/security-logs"

export default async function AdminSecurityLogsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
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

  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const limit = 20
  const skip = (page - 1) * limit

  const eventType = typeof searchParams.eventType === "string" ? searchParams.eventType : undefined
  const severity = typeof searchParams.severity === "string" ? searchParams.severity : undefined
  const startDate = typeof searchParams.startDate === "string" ? new Date(searchParams.startDate) : undefined
  const endDate = typeof searchParams.endDate === "string" ? new Date(searchParams.endDate) : undefined

  const where = {
    ...(eventType ? { eventType } : {}),
    ...(severity ? { severity } : {}),
    ...(startDate || endDate
      ? {
          timestamp: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  }

  const logs = await db.securityLog.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      timestamp: "desc",
    },
    include: {
      user: true,
    },
  })

  const totalLogs = await db.securityLog.count({ where })
  const totalPages = Math.ceil(totalLogs / limit)

  // Get event types for filter
  const eventTypes = await db.securityLog.findMany({
    select: {
      eventType: true,
    },
    distinct: ["eventType"],
  })

  return (
    <AdminSecurityLogs
      logs={logs}
      currentPage={page}
      totalPages={totalPages}
      eventType={eventType}
      severity={severity}
      startDate={startDate?.toISOString().split("T")[0]}
      endDate={endDate?.toISOString().split("T")[0]}
      eventTypes={eventTypes.map((et) => et.eventType)}
    />
  )
}

