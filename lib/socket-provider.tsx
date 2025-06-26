"use client"

import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from "react"
import { io as ioClient, Socket } from "socket.io-client"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  retryConnection: () => void
  lastError: string | null
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  retryConnection: () => {},
  lastError: null
})

export const useSocket = () => {
  return useContext(SocketContext)
}

interface SocketProviderProps {
  children: React.ReactNode
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  const socketRef = useRef<Socket | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Initialize the socket connection
  const initializeSocket = useCallback(() => {
    // Prevent starting another socket if we're already cleaning up
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // If there's an existing socket in the ref, disconnect it
    if (socketRef.current) {
      // console.log("Cleaning up existing socket connection");
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setLastError(null);
    
    try {
      // console.log("Initializing socket connection...");
      
      // Add a timestamp query param to avoid browser caching issues
      const socketInstance = ioClient(process.env.NEXT_PUBLIC_APP_URL || "", {
        path: "/api/socket/io",
        addTrailingSlash: false,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000, // 10 seconds
        transports: ["websocket", "polling"],
        forceNew: true, // Force a new connection to avoid issues with browser caching
        query: {
          t: Date.now().toString() // Add timestamp to prevent cached responses
        }
      });

      // Store in ref first, only update state after successful connection
      socketRef.current = socketInstance;

      // Connection event handlers
      socketInstance.on("connect", () => {
        // console.log("Socket connected successfully", socketInstance.id);
        setSocket(socketInstance); // Only set socket in state after successful connection
        setIsConnected(true);
        setRetryCount(0); // Reset retry count on successful connection
        setLastError(null);
      });

      socketInstance.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
        setIsConnected(false);
        setLastError(`Connection error: ${err.message}`);
        
        if (retryCount < maxRetries) {
          // Auto retry with increasing delay
          const delay = (retryCount + 1) * 2000;
          // console.log(`Will retry connection in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          const timeoutId = setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, delay);
          
          // Store cleanup function
          const prevCleanup = cleanupRef.current;
          cleanupRef.current = () => {
            clearTimeout(timeoutId);
            if (prevCleanup) prevCleanup();
          };
        }
      });

      socketInstance.on("disconnect", (reason) => {
        // console.log("Socket disconnected:", reason);
        setIsConnected(false);
        
        // If the disconnect was due to transport close, try reconnecting automatically
        if (reason === 'transport close' || reason === 'ping timeout') {
          // console.log("Transport closed, attempting to reconnect automatically");
          // Don't call connect directly, let Socket.IO handle reconnection
        }
      });

      // Handle errors
      socketInstance.on("error", (error) => {
        console.error("Socket error:", error);
        setLastError(`Socket error: ${error instanceof Error ? error.message : String(error)}`);
      });
      
      // Enhanced ping mechanism for reliable connection
      let pingTimeoutId: NodeJS.Timeout | null = null;
      
      const pingInterval = setInterval(() => {
        if (socketInstance.connected) {
          // Send ping with timestamp to measure latency
          const pingStart = Date.now();
          socketInstance.emit("ping", { timestamp: pingStart, attachmentsEnabled: true });
          
          // Set a timeout to detect missing pong responses
          pingTimeoutId = setTimeout(() => {
            console.warn("Ping timeout detected, connection may be unstable");
            setLastError("Connection unstable - ping timeout");
          }, 5000);
        }
      }, 30000); // Send ping every 30 seconds

      // Listen for pong responses
      socketInstance.on("pong", (data) => {
        // Clear the ping timeout
        if (pingTimeoutId) {
          clearTimeout(pingTimeoutId);
          pingTimeoutId = null;
        }
        
        // Calculate latency if timestamp was included
        if (data && data.time) {
          const latency = Date.now() - data.time;
          // console.log(`Socket latency: ${latency}ms`);
        }
      });

      // Store cleanup function
      cleanupRef.current = () => {
        // console.log("Cleaning up socket connection");
        clearInterval(pingInterval);
        if (pingTimeoutId) {
          clearTimeout(pingTimeoutId);
        }
        if (socketInstance) {
          socketInstance.disconnect();
          socketInstance.removeAllListeners();
        }
        socketRef.current = null;
      };

      return;
    } catch (error) {
      console.error("Error initializing socket:", error);
      setLastError(`Error initializing socket: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
  }, [retryCount]); // Only depend on retryCount

  // Initialize socket on component mount
  useEffect(() => {
    initializeSocket();
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [initializeSocket]);

  // Function to manually retry connection
  const retryConnection = useCallback(() => {
    // console.log("Manually retrying socket connection");
    setRetryCount(0); // Reset retry count for manual retry
    
    // Perform cleanup before reinitializing
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    initializeSocket();
  }, [initializeSocket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, retryConnection, lastError }}>
      {children}
    </SocketContext.Provider>
  )
}

