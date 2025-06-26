import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import DOMPurify from "isomorphic-dompurify"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date | string) {
  if (!date) return ""
  
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "MMM d, yyyy")
}

export function generateOTP(): string {
  // Generate a random 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price)
}

export function sanitizeInput(input: string): string {
  // Use DOMPurify to sanitize the input and prevent XSS
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Only allow text, strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
  }).trim()
}

// Get the other participant in a one-on-one conversation
export function getOtherParticipant(conversation: any, currentUserId: string) {
  if (!conversation.participants || !conversation.participants.length) {
    return null
  }
  
  return conversation.participants.find(
    (participant: any) => participant.userId !== currentUserId
  )
}
