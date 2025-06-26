"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Download } from "lucide-react"

interface AdminSecurityLogsProps {
  logs: any[]
  currentPage: number
  totalPages: number
  eventType?: string
  severity?: string
  startDate?: string
  endDate?: string
  eventTypes: string[]
}

export default function AdminSecurityLogs({
  logs,
  currentPage,
  totalPages,
  eventType,
  severity,
  startDate,
  endDate,
  eventTypes,
}: AdminSecurityLogsProps) {
  const router = useRouter()
  const [eventTypeFilter, setEventTypeFilter] = useState(eventType || "")
  const [severityFilter, setSeverityFilter] = useState(severity || "")
  const [startDateFilter, setStartDateFilter] = useState(startDate || "")
  const [endDateFilter, setEndDateFilter] = useState(endDate || "")

  const handleApplyFilters = () => {
    const params = new URLSearchParams()
    if (eventTypeFilter) params.set("eventType", eventTypeFilter)
    if (severityFilter) params.set("severity", severityFilter)
    if (startDateFilter) params.set("startDate", startDateFilter)
    if (endDateFilter) params.set("endDate", endDateFilter)
    params.set("page", "1")

    router.push(`/admin/security-logs?${params.toString()}`)
  }

  const handleResetFilters = () => {
    setEventTypeFilter("")
    setSeverityFilter("")
    setStartDateFilter("")
    setEndDateFilter("")

    router.push("/admin/security-logs")
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams()
    if (eventTypeFilter) params.set("eventType", eventTypeFilter)
    if (severityFilter) params.set("severity", severityFilter)
    if (startDateFilter) params.set("startDate", startDateFilter)
    if (endDateFilter) params.set("endDate", endDateFilter)
    params.set("page", page.toString())

    router.push(`/admin/security-logs?${params.toString()}`)
  }

  const handleExportLogs = () => {
    // In a real app, this would generate a CSV or JSON file for download
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(logs, null, 2))}`

    const link = document.createElement("a")
    link.href = jsonString
    link.download = "security-logs.json"
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Security Logs</h1>
        <Button onClick={handleExportLogs} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      <div className="border rounded-md p-4 space-y-4">
        <h2 className="font-semibold">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Event Type</label>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Severity</label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Start Date</label>
            <Input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">End Date</label>
            <Input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleResetFilters}>
            Reset Filters
          </Button>
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </div>
      </div>

      <div className="border rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Event Type</th>
                <th className="text-left py-3 px-4 font-medium">User</th>
                <th className="text-left py-3 px-4 font-medium">IP Address</th>
                <th className="text-left py-3 px-4 font-medium">Severity</th>
                <th className="text-left py-3 px-4 font-medium">Timestamp</th>
                <th className="text-left py-3 px-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 px-4 text-center text-muted-foreground">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="py-3 px-4">{log.eventType}</td>
                    <td className="py-3 px-4">{log.user ? log.user.name : "N/A"}</td>
                    <td className="py-3 px-4">{log.ipAddress}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs ${
                          log.severity === "INFO"
                            ? "bg-blue-100 text-blue-800"
                            : log.severity === "LOW"
                              ? "bg-green-100 text-green-800"
                              : log.severity === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-800"
                                : log.severity === "HIGH"
                                  ? "bg-orange-100 text-orange-800"
                                  : log.severity === "CRITICAL"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

