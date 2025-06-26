import { db } from "@/lib/db"
import { formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell } from "lucide-react"

interface NotificationsWidgetProps {
  userId: string
}

export default async function NotificationsWidget({ userId }: NotificationsWidgetProps) {
  // Get recent notifications for the user
  const notifications = await db.notification.findMany({
    where: {
      userId,
      read: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Bell className="h-4 w-4 mr-2" />
          Recent Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No new notifications</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="text-sm p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer">
                <p>{notification.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(notification.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

