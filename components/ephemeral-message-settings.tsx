"use client"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock } from "lucide-react"

interface EphemeralMessageSettingsProps {
  isEphemeral: boolean
  expiryTime: string
  onEphemeralChange: (value: boolean) => void
  onExpiryTimeChange: (value: string) => void
}

export default function EphemeralMessageSettings({
  isEphemeral,
  expiryTime,
  onEphemeralChange,
  onExpiryTimeChange,
}: EphemeralMessageSettingsProps) {
  return (
    <div className="flex flex-col space-y-4 p-4 border rounded-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="ephemeral-toggle" className="cursor-pointer">
            Disappearing Messages
          </Label>
        </div>
        <Switch id="ephemeral-toggle" checked={isEphemeral} onCheckedChange={onEphemeralChange} />
      </div>

      {isEphemeral && (
        <div className="space-y-2">
          <Label htmlFor="expiry-time">Messages disappear after</Label>
          <Select value={expiryTime} onValueChange={onExpiryTimeChange}>
            <SelectTrigger id="expiry-time">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">5 minutes</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="6h">6 hours</SelectItem>
              <SelectItem value="12h">12 hours</SelectItem>
              <SelectItem value="1d">1 day</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

