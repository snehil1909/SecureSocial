import { db } from "@/lib/db"

interface SecurityEventOptions {
  eventType: string
  userId?: string
  ipAddress: string
  userAgent: string
  details: any
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "INFO" | "WARNING"
}

export async function logSecurityEvent(options: SecurityEventOptions): Promise<void> {
  try {
    await db.securityLog.create({
      data: {
        eventType: options.eventType,
        userId: options.userId,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        details: JSON.stringify(options.details),
        severity: options.severity,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    // Log to console if database logging fails
    console.error("Failed to log security event:", error)
    console.log("Security event:", options)
  }
}

