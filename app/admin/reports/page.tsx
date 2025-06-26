"use client"

import { Suspense } from "react"
import AdminReportList from "@/components/admin/report-list"
import { db } from "@/lib/db"

interface PageProps {
  searchParams: {
    page?: string
    status?: string
    type?: string
  }
}

async function getReports(page = 1, status?: string, type?: string) {
  const itemsPerPage = 10
  const skip = (page - 1) * itemsPerPage

  const where = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(type && type !== "ALL" ? { type } : {}),
  }

  const [reports, total] = await Promise.all([
    db.report.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reportedProduct: {
          select: {
            id: true,
            title: true,
          },
        },
        reportedMessage: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: itemsPerPage,
    }),
    db.report.count({ where }),
  ])

  return {
    reports,
    currentPage: page,
    totalPages: Math.ceil(total / itemsPerPage),
  }
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const page = searchParams.page ? parseInt(searchParams.page) : 1
  const { reports, currentPage, totalPages } = await getReports(
    page,
    searchParams.status,
    searchParams.type
  )

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminReportList
        reports={reports}
        currentPage={currentPage}
        totalPages={totalPages}
        status={searchParams.status}
        type={searchParams.type}
      />
    </Suspense>
  )
}

