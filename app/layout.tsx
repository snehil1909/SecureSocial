import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth-provider"
import { SocketProvider } from "@/lib/socket-provider"
import Header from "@/components/header"
import NotificationBanner from "@/components/notification-banner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SecureSocial - End-to-End Encrypted Social Platform",
  description: "A secure social media platform with end-to-end encryption",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <SocketProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <NotificationBanner />
              <Header />
              {children}
              <Toaster />
            </ThemeProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}



import './globals.css'