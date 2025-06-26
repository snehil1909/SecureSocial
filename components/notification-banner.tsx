"use client"

import { useState, useEffect } from "react"
import { Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotificationBanner() {
  const [isVisible, setIsVisible] = useState(true)

  // Check if the banner was previously closed
  useEffect(() => {
    const bannerClosed = localStorage.getItem('notificationBannerClosed')
    if (bannerClosed === 'true') {
      setIsVisible(false)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    // Save the user's preference in localStorage
    localStorage.setItem('notificationBannerClosed', 'true')
  }

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto py-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-amber-800">
            <div className="bg-amber-100 p-1 rounded-full mr-2">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="overflow-hidden whitespace-nowrap">
              <div className="animate-marquee inline-block">
                <span className="font-medium">Please note:</span> After clicking any button, please wait a few moments as loading may take time. Do not press the button again.
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-100 ml-2 flex-shrink-0"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>
    </div>
  )
} 