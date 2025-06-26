import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "People - SecureSocial",
  description: "Find and connect with people on SecureSocial",
}

export default function PeopleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

