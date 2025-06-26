import { NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { logSecurityEvent } from "@/lib/security-logger"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = headers().get("stripe-signature") as string

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session

        if (!session?.metadata?.productId || !session?.metadata?.buyerId || !session?.metadata?.sellerId) {
          return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
        }

        // Update order status
        await db.order.updateMany({
          where: {
            stripeSessionId: session.id,
          },
          data: {
            status: "PAID",
          },
        })

        // Update product status
        await db.product.update({
          where: {
            id: session.metadata.productId,
          },
          data: {
            status: "SOLD",
          },
        })

        // Create notifications
        await db.notification.create({
          data: {
            userId: session.metadata.buyerId,
            type: "ORDER_PAID",
            content: "Your payment was successful. The seller has been notified.",
            referenceId: session.metadata.productId,
          },
        })

        await db.notification.create({
          data: {
            userId: session.metadata.sellerId,
            type: "ORDER_RECEIVED",
            content: "You have received a new order. Please check your orders.",
            referenceId: session.metadata.productId,
          },
        })

        // Log the event
        await logSecurityEvent({
          eventType: "PAYMENT_COMPLETED",
          userId: session.metadata.buyerId,
          ipAddress: "stripe-webhook",
          userAgent: "stripe-webhook",
          details: {
            productId: session.metadata.productId,
            sellerId: session.metadata.sellerId,
            sessionId: session.id,
            amount: session.amount_total,
          },
          severity: "INFO",
        })

        break

      case "checkout.session.expired":
        const expiredSession = event.data.object as Stripe.Checkout.Session

        if (expiredSession.metadata?.productId) {
          // Update order status
          await db.order.updateMany({
            where: {
              stripeSessionId: expiredSession.id,
            },
            data: {
              status: "CANCELLED",
            },
          })

          // Log the event
          await logSecurityEvent({
            eventType: "PAYMENT_EXPIRED",
            userId: expiredSession.metadata.buyerId,
            ipAddress: "stripe-webhook",
            userAgent: "stripe-webhook",
            details: {
              productId: expiredSession.metadata.productId,
              sessionId: expiredSession.id,
            },
            severity: "INFO",
          })
        }
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

