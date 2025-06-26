"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Flag, Ban, XCircle, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

interface Report {
  id: string
  type: "USER" | "PRODUCT" | "MESSAGE"
  reason: string
  status: "PENDING" | "REJECTED" | "SUSPENDED"
  createdAt: string
  reporter: {
    id: string
    name: string
    email: string
  }
  reportedUser?: {
    id: string
    name: string
    email: string
  }
  reportedProduct?: {
    id: string
    title: string
  }
  reportedMessage?: {
    id: string
    content: string
  }
}

interface ReportListProps {
  reports: Report[]
  currentPage: number
  totalPages: number
  status?: string
  type?: string
}

export default function ReportList({
  reports,
  currentPage,
  totalPages,
  status,
  type,
}: ReportListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})

  const handleStatusChange = (newStatus: string) => {
    const params = new URLSearchParams()
    params.set("status", newStatus)
    if (type) params.set("type", type)
    router.push(`/admin/reports?${params.toString()}`)
  }

  const handleTypeChange = (newType: string) => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    params.set("type", newType)
    router.push(`/admin/reports?${params.toString()}`)
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (type) params.set("type", type)
    params.set("page", page.toString())
    router.push(`/admin/reports?${params.toString()}`)
  }

  const handleAction = async (reportId: string, action: "suspend" | "reject") => {
    setLoading({ ...loading, [reportId]: true })
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: action === "suspend" ? "SUSPENDED" : "REJECTED",
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} report`)
      }

      if (action === "suspend") {
        // Also suspend the reported user
        const report = reports.find(r => r.id === reportId)
        if (report?.reportedUser?.id) {
          const userResponse = await fetch(`/api/users/${report.reportedUser.id}/suspend`, {
            method: "POST",
          })
          if (!userResponse.ok) {
            throw new Error("Failed to suspend user")
          }
        }
      }

      toast.success(`Report ${action === "suspend" ? "accepted and user suspended" : "rejected"}`)
      router.refresh()
    } catch (error: any) {
      toast.error(`Error ${action}ing report: ${error.message}`)
    } finally {
      setLoading({ ...loading, [reportId]: false })
    }
  }

  const getStatusBadge = (status: Report["status"]) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
      case "SUSPENDED":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Suspended</Badge>
      case "REJECTED":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Rejected</Badge>
    }
  }

  const getReportedContent = (report: Report) => {
    switch (report.type) {
      case "USER":
        return report.reportedUser ? (
          <div>
            <p className="font-medium">Reported User:</p>
            <p>{report.reportedUser.name}</p>
            <p className="text-sm text-gray-500">{report.reportedUser.email}</p>
          </div>
        ) : null
      case "PRODUCT":
        return report.reportedProduct ? (
          <div>
            <p className="font-medium">Reported Product:</p>
            <p>{report.reportedProduct.title}</p>
          </div>
        ) : null
      case "MESSAGE":
        return report.reportedMessage ? (
          <div>
            <p className="font-medium">Reported Message:</p>
            <p className="text-sm italic">"{report.reportedMessage.content}"</p>
          </div>
        ) : null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports Management</h1>
        <div className="flex gap-4">
          <select
            className="rounded-md border p-2"
            value={status || "ALL"}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            className="rounded-md border p-2"
            value={type || "ALL"}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="USER">Users</option>
            <option value="PRODUCT">Products</option>
            <option value="MESSAGE">Messages</option>
          </select>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Reports</TabsTrigger>
          <TabsTrigger value="processed">Processed Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid gap-4">
            {reports
              .filter((report) => report.status === "PENDING")
              .map((report) => (
                <Card key={report.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Flag className="h-5 w-5" />
                      {report.type} Report
                      {getStatusBadge(report.status)}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(report.id, "suspend")}
                        disabled={loading[report.id]}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Suspend User
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(report.id, "reject")}
                        disabled={loading[report.id]}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Report
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium">Reporter:</p>
                        <p>{report.reporter.name}</p>
                        <p className="text-sm text-gray-500">{report.reporter.email}</p>
                      </div>
                      {getReportedContent(report)}
                      <div>
                        <p className="font-medium">Reason:</p>
                        <p className="text-sm">{report.reason}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        Reported on: {formatDate(report.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="processed">
          <div className="grid gap-4">
            {reports
              .filter((report) => report.status !== "PENDING")
              .map((report) => (
                <Card key={report.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Flag className="h-5 w-5" />
                      {report.type} Report
                      {getStatusBadge(report.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium">Reporter:</p>
                        <p>{report.reporter.name}</p>
                        <p className="text-sm text-gray-500">{report.reporter.email}</p>
                      </div>
                      {getReportedContent(report)}
                      <div>
                        <p className="font-medium">Reason:</p>
                        <p className="text-sm">{report.reason}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        Reported on: {formatDate(report.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="py-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

