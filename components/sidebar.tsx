"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, MessageCircle, ShoppingBag, Users, Bell, Settings, LogOut, Shield } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useToast } from "@/components/ui/use-toast"

export default function Sidebar() {
  const pathname = usePathname()
  const { toast } = useToast()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === "ADMIN"

  const handleSignOut = async () => {
    try {
      console.log("Sign out button clicked")
      const form = document.getElementById('signout-form') as HTMLFormElement
      if (form) form.submit()
    } catch (error) {
      console.error("Sign out error:", error)
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const routes = [
    {
      label: "Dashboard",
      icon: Home,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "Messages",
      icon: MessageCircle,
      href: "/messages",
      active: pathname === "/messages" || pathname.startsWith("/messages/"),
    },
    {
      label: "Marketplace",
      icon: ShoppingBag,
      href: "/marketplace",
      active: pathname === "/marketplace" || pathname.startsWith("/marketplace/"),
    },
    {
      label: "People",
      icon: Users,
      href: "/people",
      active: pathname === "/people",
    },
    {
      label: "Notifications",
      icon: Bell,
      href: "/notifications",
      active: pathname === "/notifications",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/dashboard/settings",
      active: pathname === "/dashboard/settings",
    },
    {
      label: "Admin",
      icon: Shield,
      href: "/admin",
      active: pathname === "/admin" || pathname.startsWith("/admin/"),
      admin: true,
    },
  ]

  return (
    <div className="h-full flex flex-col bg-background border-r border-border w-64">
      <div className="p-4 border-b border-border flex items-center space-x-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">SecureSocial</h1>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {routes.map((route) => {
            if (route.admin && (session?.user as any)?.role !== "ADMIN") {
              return null
            }

            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  route.active ? "bg-accent text-accent-foreground" : "transparent",
                )}
              >
                <route.icon className="h-4 w-4" />
                {route.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-border mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
        
        <form method="post" action="/api/auth/signout" id="signout-form" className="hidden">
          <input type="hidden" name="callbackUrl" value="/" />
          <input type="hidden" name="csrfToken" value="" />
        </form>
      </div>
    </div>
  )
}

