import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import AdminUserList from "@/components/admin/user-list"

export default async function AdminUsersPage({
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
  const limit = 10
  const skip = (page - 1) * limit

  const search = typeof searchParams.search === "string" ? searchParams.search : undefined
  const status = typeof searchParams.status === "string" ? searchParams.status : undefined

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
  }

  const users = await db.user.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  })

  const totalUsers = await db.user.count({ where })
  const totalPages = Math.ceil(totalUsers / limit)

  return <AdminUserList users={users} currentPage={page} totalPages={totalPages} search={search} status={status} />
}

