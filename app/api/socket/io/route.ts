import { Server as NetServer } from "http"
import { NextRequest, NextResponse } from "next/server"
import { Server as SocketIOServer } from "socket.io"
import { getSession } from "next-auth/react"
import { getToken } from "next-auth/jwt"
import { NextApiResponseServerIO } from "@/types/socket"

// Socket.IO instance
let io: SocketIOServer | null = null

// Initialize socket server
const initSocketServer = (res: NextApiResponseServerIO) => {
  console.log("Initializing Socket.IO server through Next.js API...")
  
  try {
    if (!res.socket.server.io) {
      // Create new Socket.IO instance
      io = new SocketIOServer(res.socket.server as any, {
        path: "/api/socket/io",
        addTrailingSlash: false,
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
        connectTimeout: 10000, // 10 seconds instead of default 45s
        pingTimeout: 10000, // 10 seconds 
        pingInterval: 5000, // 5 seconds
        maxHttpBufferSize: 5 * 1024 * 1024, // 5MB for handling image uploads
        serveClient: false,
        allowUpgrades: true,
        upgradeTimeout: 10000
      })
      
      // Set up event handlers
      io.on("connection", (socket) => {
        console.log(`Socket ${socket.id} connected (binary support enabled)`)
        
        // Send welcome message to newly connected client
        socket.emit("welcome", { 
          message: "Welcome to FCS Secure Messenger",
          socketId: socket.id,
          timestamp: new Date().toISOString()
        })
        
        // Handle conversation joining
        socket.on("join_conversation", (conversationId: string) => {
          console.log(`Socket ${socket.id} joining conversation: ${conversationId}`)
          socket.join(conversationId)
          socket.emit("joined-conversation", { conversationId, success: true })
        })
        
        // Handle conversation leaving
        socket.on("leave_conversation", (conversationId: string) => {
          console.log(`Socket ${socket.id} leaving conversation: ${conversationId}`)
          socket.leave(conversationId)
        })
        
        // Handle ping (keep-alive)
        socket.on("ping", (data = {}) => {
          const response = { 
            time: data.timestamp || Date.now(),
            server: Date.now(),
            // Echo back any data sent to us
            ...data
          };
          socket.emit("pong", response);
        })
        
        // Handle reconnection attempts
        socket.on("reconnect_attempt", (attemptNumber: number) => {
          console.log(`Socket ${socket.id} reconnection attempt: ${attemptNumber}`)
        })
        
        // Handle errors
        socket.on("error", (error: Error) => {
          console.error(`Socket ${socket.id} error:`, error)
        })
        
        // Handle disconnection
        socket.on("disconnect", (reason: string) => {
          console.log(`Socket ${socket.id} disconnected: ${reason}`)
        })
      })
      
      // Save the io instance
      res.socket.server.io = io
      
      console.log("Socket.IO server initialized successfully")
      return true
    } else {
      // Reuse existing Socket.IO instance
      io = res.socket.server.io
      console.log("Reusing existing Socket.IO server")
      return true
    }
  } catch (error) {
    console.error("Failed to initialize Socket.IO server:", error)
    return false
  }
}

// Initialize socket and return socket info
export async function GET(req: NextRequest, res: any) {
  console.log("Socket.IO endpoint hit")
  
  if (!res.socket || !res.socket.server) {
    return NextResponse.json(
      { 
        error: "This endpoint is meant to be used with server-side rendering",
        socketStatus: "unavailable" 
      },
      { status: 200 }
    )
  }

  // Initialize socket server through Next.js API route
  try {
    const initialized = initSocketServer(res)
    
    return NextResponse.json(
      { 
        socketStatus: initialized ? "connected" : "error",
        path: "/api/socket/io",
        status: "ok" 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Socket initialization error:", error)
    return NextResponse.json(
      { 
        socketStatus: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error" 
      },
      { status: 500 }
    )
  }
}

// Export io for use in other server components
export { io }

