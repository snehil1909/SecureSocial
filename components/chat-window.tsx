"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Send, Image, Paperclip, Info, Clock, AlertTriangle, ExternalLink, Video, FileAudio, Download } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useSocket } from "@/lib/socket-provider"
import {
  decryptSessionKey,
  decryptMessage,
  createBlockchainMessage,
  encryptMessage,
  validateMessageChain,
} from "@/lib/crypto/message-chain"
import MediaUpload from "@/components/media-upload"
import MediaAttachment from "@/components/media-attachment"
import EphemeralMessageSettings from "@/components/ephemeral-message-settings"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import ChatHeader from "@/components/chat-header"

interface ChatWindowProps {
  currentUserId: string
  conversation: any
  userPrivateKey: string
  keyFingerprint?: string
  pageLoadTime?: string
}

interface Participant {
  userId: string;
  encryptedSessionKey?: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  signature: string;
  previousHash: string;
  hash: string;
  isEphemeral?: boolean;
  expiresAt?: string;
  createdAt: string;
  sender?: {
    name: string;
    image?: string;
  };
  attachments?: Array<{
    id: string;
    type: string;
    url: string;
    name: string;
    size: number;
  }>;
}

export default function ChatWindow({ 
  currentUserId, 
  conversation, 
  userPrivateKey,
  keyFingerprint,
  pageLoadTime
}: ChatWindowProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({})
  const [showMediaUpload, setShowMediaUpload] = useState(false)
  const [attachments, setAttachments] = useState<{ type: string; url: string; name: string; size: number }[]>([])
  const [isEphemeral, setIsEphemeral] = useState(false)
  const [expiryTime, setExpiryTime] = useState("1h")
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [chainValid, setChainValid] = useState(true)
  const [decryptionFailed, setDecryptionFailed] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [bypassMode, setBypassMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { socket, isConnected, retryConnection, lastError } = useSocket()
  const [showSocketError, setShowSocketError] = useState(false)

  // Debug key information for troubleshooting
  const keyInfo = {
    conversationId: conversation?.id || 'not selected',
    socketStatus: isConnected ? 'connected' : 'disconnected',
    privateKeyAvailable: !!userPrivateKey,
    privateKeyLength: userPrivateKey?.length || 0,
    privateKeyStart: userPrivateKey?.substring(0, 50),
    privateKeyEnd: userPrivateKey?.length > 100 ? userPrivateKey?.substring(userPrivateKey.length - 50) : null,
    privateKeyFingerprint: keyFingerprint || 'unknown',
    pageLoadTimestamp: pageLoadTime || new Date().toISOString(),
    sessionKeyAvailable: !!sessionKey,
    sessionKeyLength: sessionKey?.length || 0,
    encryptedSessionKeyAvailable: !!conversation?.participants?.find((p: Participant) => p.userId === currentUserId)?.encryptedSessionKey,
    encryptedSessionKeyLength: conversation?.participants?.find((p: Participant) => p.userId === currentUserId)?.encryptedSessionKey?.length || 0,
    encryptedSessionKeyValue: conversation?.participants?.find((p: Participant) => p.userId === currentUserId)?.encryptedSessionKey?.substring(0, 30) + "...",
    messagesCount: conversation?.messages?.length || 0,
    decryptedMessagesCount: Object.keys(decryptedMessages).length,
    systemTime: new Date().toISOString()
  };

  // Toggle debug mode with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle debug mode
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugMode(prev => !prev);
        // console.log("Debug mode:", !debugMode);
      }
      
      // Ctrl+Shift+B to toggle bypass mode - EMERGENCY USE ONLY
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        setBypassMode(prev => !prev);
        // console.log("EMERGENCY BYPASS MODE:", !bypassMode);
        if (!bypassMode) {
          toast({
            title: "EMERGENCY BYPASS MODE ACTIVATED",
            description: "WARNING: Messages will be displayed without decryption. Security is compromised!",
            variant: "destructive",
          });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [debugMode, bypassMode, toast]);

  useEffect(() => {
    // console.log("Socket connected:", isConnected);
    // console.log("Session key available:", !!sessionKey);
    // console.log("User private key available:", !!userPrivateKey);

    if (!conversation) {
      console.log("No conversation selected");
      return;
    }

    if (conversation?.participants) {
      const userParticipant = conversation.participants.find((p: Participant) => p.userId === currentUserId)
      // console.log("User participant found:", !!userParticipant);
      // console.log("Encrypted session key available:", !!userParticipant?.encryptedSessionKey);

      if (userParticipant?.encryptedSessionKey && userPrivateKey) {
        // More robust session key decryption with multiple attempts
        const decryptWithRetry = async () => {
          let attempts = 0;
          const maxAttempts = 3;
          let lastError = null;
          
          // Try to decrypt a few times with different approaches
          while (attempts < maxAttempts) {
            attempts++;
            try {
              console.log(`Decryption attempt ${attempts}/${maxAttempts}...`);
              
              const decryptedKey = decryptSessionKey(userParticipant.encryptedSessionKey, userPrivateKey);
              
              // Validate the decrypted key
              if (!decryptedKey || decryptedKey.length !== 44) { // Base64 encoded 32-byte key has length ~= 44
                console.error(`Invalid session key format: length=${decryptedKey?.length}`);
                throw new Error("Invalid session key format");
              }
              
              // Log key details for debugging (truncated for security)
              console.log(`Successfully decrypted session key on attempt ${attempts}, length: ${decryptedKey.length}, prefix: ${decryptedKey.substring(0, 5)}...`);
              
              // Store the validated session key
              setSessionKey(decryptedKey);
              setDecryptionFailed(false);
              return; // Success, exit the retry loop
            } catch (error) {
              console.error(`Decryption attempt ${attempts} failed:`, error);
              lastError = error;
              
              // Wait a bit before next attempt
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
          
          // All attempts failed
          console.error("All session key decryption attempts failed:", lastError);
          setDecryptionFailed(true);
          toast({
            title: "Decryption Error",
            description: "Could not decrypt conversation after multiple attempts. Try regenerating your keys.",
            variant: "destructive",
          });
        };
        
        decryptWithRetry();
      } else {
        console.error("Missing encrypted session key or private key:", {
          hasEncryptedSessionKey: !!userParticipant?.encryptedSessionKey,
          hasPrivateKey: !!userPrivateKey,
          privateKeyLength: userPrivateKey?.length || 0
        });
        setDecryptionFailed(true);
        toast({
          title: "Encryption Error",
          description: userParticipant?.encryptedSessionKey 
            ? "Private key issue detected. Try regenerating your keys." 
            : "Missing session key. Try refreshing or creating a new conversation.",
          variant: "destructive",
        });
      }
    }
  }, [conversation, currentUserId, userPrivateKey, isConnected, toast])

  useEffect(() => {
    if (conversation?.messages && sessionKey) {
      console.log("Starting message decryption with session key");
      const decryptAll = async () => {
        const decrypted: Record<string, string> = {}
        let decryptedCount = 0;
        let failedCount = 0;

        for (const msg of conversation.messages) {
          try {
            if (!msg.content || msg.content.trim() === "") {
              decrypted[msg.id] = ""
              continue
            }

            const decryptedContent = decryptMessage(msg.content, sessionKey)
            
            // Check if this message has attachments in the database
            if (msg.attachments && msg.attachments.length > 0) {
              console.log(`Decrypting message ${msg.id} with ${msg.attachments.length} attachments`);
              
              // For messages with attachments, we want to store a structured format
              // Try to parse existing content as JSON first
              try {
                const parsed = JSON.parse(decryptedContent);
                if (parsed && typeof parsed === 'object') {
                  // Already in JSON format, just use it
                  decrypted[msg.id] = decryptedContent;
                } else {
                  // Not a valid object, create one with the content as text
                  decrypted[msg.id] = JSON.stringify({
                    text: decryptedContent,
                    hasAttachments: true
                  });
                }
              } catch (e) {
                // Not JSON, check if it might be binary data
                const hasBinaryData = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(decryptedContent) || decryptedContent.includes('\uFFFD');
                if (hasBinaryData) {
                  // Likely binary data, don't use as text
                  decrypted[msg.id] = JSON.stringify({
                    text: "",
                    hasAttachments: true,
                    binaryContent: true
                  });
                } else {
                  // Regular text content with attachments
                  decrypted[msg.id] = JSON.stringify({
                    text: decryptedContent,
                    hasAttachments: true
                  });
                }
              }
              decryptedCount++;
              continue;
            }
            
            // Handle attachment references if present
            let displayContent = decryptedContent;
            try {
              const parsed = JSON.parse(decryptedContent);
              if (parsed && parsed.hasAttachments) {
                // This is a message with attachments
                // The actual content is in the text field
                displayContent = parsed.text || "";
              }
            } catch (e) {
              // Not a JSON object, check if content might be binary data
              const hasBinaryData = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(decryptedContent) || decryptedContent.includes('\uFFFD');
              if (hasBinaryData && decryptedContent.length > 100) {
                // Likely binary data, don't display as text
                displayContent = "[Binary data - cannot display]";
              }
            }
            
            decrypted[msg.id] = displayContent
            decryptedCount++;
            
            // Check if this is a decryption warning
            try {
              const parsed = JSON.parse(decryptedContent);
              if (parsed.decryptionWarning) {
                console.warn("Decryption warning:", parsed.decryptionWarning, "for message ID:", msg.id);
                // Count it as a partial success
                decryptedCount--;
                failedCount++;
              }
            } catch (e) {
              // Not a JSON warning message, continue normally
            }
          } catch (error) {
            console.error("Failed to decrypt message:", error, "Message ID:", msg.id)
            decrypted[msg.id] = "Failed to decrypt message"
            failedCount++;
          }
        }

        setDecryptedMessages(decrypted)
        console.log(`Message decryption complete. Success: ${decryptedCount}, Failed: ${failedCount}`);

        const blockchainMessages = conversation.messages.map((msg: Message) => ({
          id: msg.id,
          content: decrypted[msg.id] || "",
          sender: msg.senderId,
          timestamp: new Date(msg.timestamp).getTime(),
          signature: msg.signature,
          previousHash: msg.previousHash,
          hash: msg.hash,
        }))

        const isValid = validateMessageChain(blockchainMessages, conversation.participants)
        console.log("Message chain validation result:", isValid);
        setChainValid(isValid)
        
        // If chain validation fails but messages successfully decrypted, show a warning but don't block
        if (!isValid && decryptedCount > 0) {
          console.warn("Message chain integrity warning: Some messages may have been altered.");
          toast({
            title: "Message Chain Warning",
            description: "Message chain integrity check failed. Some messages may have been altered. The conversation will still be displayed.",
            variant: "default",
          });
        }
      }

      decryptAll()
    }
  }, [conversation, sessionKey])

  useEffect(() => {
    scrollToBottom()
  }, [decryptedMessages])

  useEffect(() => {
    if (socket && conversation) {
      console.log("Joining conversation:", conversation.id);
      socket.emit("join_conversation", conversation.id)

      const handleNewMessage = async (newMessage: any) => {
        console.log("Received new message:", {
          messageId: newMessage.id,
          conversationId: newMessage.conversationId,
          currentConversationId: conversation.id
        });

        if (newMessage.conversationId === conversation.id) {
          setMessages((prev) => [...prev, newMessage])

          try {
            if (!newMessage.content || newMessage.content.trim() === "") {
              console.log("Empty message content, skipping decryption");
              setDecryptedMessages((prev) => ({
                ...prev,
                [newMessage.id]: "",
              }))
              return
            }

            if (!sessionKey) {
              console.error("No session key available for decryption");
              setDecryptedMessages((prev) => ({
                ...prev,
                [newMessage.id]: "Decryption failed - no session key",
              }))
              return
            }

            console.log("Attempting to decrypt new message...");
            // Check if this message has attachments
            if (newMessage.attachments && newMessage.attachments.length > 0) {
              console.log(`Incoming message has ${newMessage.attachments.length} attachments`);
              
              // For messages with attachments, we want to ensure we don't display binary data
              try {
                const decryptedContent = decryptMessage(newMessage.content, sessionKey);
                console.log("Successfully decrypted message with attachments");
                
                // Try to parse it as JSON first
                try {
                  const parsedContent = JSON.parse(decryptedContent);
                  // If it's already in the right format, use it
                  if (parsedContent && typeof parsedContent === 'object') {
                    console.log("Message with attachments has valid JSON content");
                    setDecryptedMessages((prev) => ({
                      ...prev,
                      [newMessage.id]: decryptedContent,
                    }));
                  } else {
                    // Not in the right format, wrap it
                    console.log("Message with attachments has text content, wrapping in JSON");
                    setDecryptedMessages((prev) => ({
                      ...prev,
                      [newMessage.id]: JSON.stringify({
                        text: decryptedContent,
                        hasAttachments: true
                      }),
                    }));
                  }
                } catch (jsonError) {
                  console.error("Error parsing message with attachments as JSON:", jsonError);
                  // Not JSON, check if it might be binary data
                  const hasBinaryData = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(decryptedContent) || 
                                       decryptedContent.includes('\uFFFD');
                  
                  console.log("Message appears to contain binary data:", hasBinaryData);
                  
                  // Store a proper message structure without the binary content
                  setDecryptedMessages((prev) => ({
                    ...prev,
                    [newMessage.id]: JSON.stringify({
                      text: hasBinaryData ? "" : decryptedContent,
                      hasAttachments: true,
                      binaryContent: hasBinaryData
                    }),
                  }));
                }
              } catch (error) {
                console.error("Failed to decrypt message with attachments:", error);
                setDecryptedMessages((prev) => ({
                  ...prev,
                  [newMessage.id]: JSON.stringify({
                    text: "Failed to decrypt message",
                    hasAttachments: true,
                    error: true
                  }),
                }));
              }
              return; // Skip the regular message handling
            }
            
            // Try multiple times with a short delay in case of issues
            let decrypted = "";
            let success = false;
            
            for (let i = 0; i < 3; i++) {
              try {
                // Wait a short time to ensure all data is ready
                if (i > 0) {
                  await new Promise(resolve => setTimeout(resolve, 100 * i));
                  console.log(`Retry ${i} to decrypt message...`);
                }
                
                decrypted = decryptMessage(newMessage.content, sessionKey);
                success = true;
                
                // Handle attachment references if present
                try {
                  const parsed = JSON.parse(decrypted);
                  if (parsed && parsed.hasAttachments) {
                    // This is a message with attachments, extract the text content
                    decrypted = parsed.text || "";
                  }
                } catch (e) {
                  // Not a JSON object, check if content might be binary data
                  const hasBinaryData = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(decrypted) || decrypted.includes('\uFFFD');
                  if (hasBinaryData && decrypted.length > 100) {
                    // Likely binary data, don't display as text
                    decrypted = "[Binary data - cannot display]";
                  }
                  // Otherwise use the content as is
                }
                
                // Check if this is a decryption warning
                try {
                  const parsed = JSON.parse(decrypted);
                  if (parsed.decryptionWarning) {
                    console.warn("Decryption warning:", parsed.decryptionWarning, "for new message");
                    // It's a partial success - we got a warning message
                  }
                } catch (e) {
                  // Not a JSON warning message, continue normally
                }
                
                break;
              } catch (decryptError) {
                console.warn(`Decryption attempt ${i+1} failed:`, decryptError);
                // Continue to next retry
              }
            }

            if (success) {
              console.log("Successfully decrypted new message");
              setDecryptedMessages((prev) => ({
                ...prev,
                [newMessage.id]: decrypted,
              }));
            } else {
              throw new Error("All decryption attempts failed");
            }
          } catch (error) {
            console.error("Failed to decrypt new message:", error, "Message ID:", newMessage.id)
            setDecryptedMessages((prev) => ({
              ...prev,
              [newMessage.id]: "Failed to decrypt message",
            }))
            
            // Show toast to user for decryption failure
            toast({
              title: "Decryption Error",
              description: "A message couldn't be decrypted. Please check your encryption keys.",
              variant: "destructive",
            });
          }
        } else {
          console.log("Message for different conversation, ignoring");
        }
      }

      // Listen for welcome message
      socket.on("welcome", (data) => {
        console.log("Received welcome message:", data);
      });

      // Listen for joined-conversation confirmation
      socket.on("joined-conversation", (data) => {
        console.log("Joined conversation confirmation:", data);
      });

      socket.on("new_message", handleNewMessage)
      socket.on("new-message", handleNewMessage) // For compatibility with both event names

      return () => {
        console.log("Leaving conversation:", conversation.id);
        socket.emit("leave_conversation", conversation.id)
        socket.off("new_message", handleNewMessage)
        socket.off("new-message", handleNewMessage)
        socket.off("welcome")
        socket.off("joined-conversation")
      }
    }
  }, [socket, conversation, sessionKey])

  useEffect(() => {
    if (!isConnected && lastError) {
      // Show socket error only after a few seconds of failed connections
      const timer = setTimeout(() => {
        setShowSocketError(true)
      }, 5000)
      
      return () => clearTimeout(timer)
    } else {
      setShowSocketError(false)
    }
  }, [isConnected, lastError])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !conversation || !sessionKey) {
      console.error("Cannot send message:", {
        hasMessage: !!message.trim(),
        hasAttachments: attachments.length > 0,
        hasConversation: !!conversation,
        hasSessionKey: !!sessionKey
      });
      return;
    }

    setIsLoading(true)

    try {
      console.log("Preparing to send message...");
      // Use conversation messages instead of local messages state
      // This ensures we always have the full history, even after page refreshes
      const allMessages = conversation.messages || [];
      const lastMessage = allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;
      const previousHash = lastMessage?.hash || "0000000000000000000000000000000000000000";
      
      console.log("Creating blockchain message with previous hash:", {
        hasLastMessage: !!lastMessage,
        previousHash: previousHash.substring(0, 8) + "..." // Log truncated for security
      });

      console.log("Creating blockchain message...");
      const blockchainMessage = createBlockchainMessage(message, currentUserId, previousHash, userPrivateKey);

      // Prepare the message content
      let contentToEncrypt = message;
      
      // If there are attachments, use a very simple format to avoid encoding issues
      if (attachments.length > 0) {
        console.log(`Preparing message with ${attachments.length} attachments - using plain text`);
        // Just use plain text - don't even use JSON
        contentToEncrypt = message ? message : `[Attachment${attachments.length > 1 ? 's' : ''}]`;
        console.log(`Using plain text content for messages with attachments: "${contentToEncrypt}"`);
      }

      console.log("Encrypting message content using session key...");
      const encryptedContent = encryptMessage(contentToEncrypt, sessionKey)

      console.log("Message encrypted successfully, length:", encryptedContent.length);
      
      // Check the current CSRF token to ensure it's available
      let csrfToken = '';
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('_csrf=')) {
          csrfToken = cookie.substring('_csrf='.length);
          break;
        }
      }
      
      // Create message payload
      const messagePayload = {
        conversationId: conversation.id,
        content: encryptedContent,
        isEphemeral,
        expiryTime: isEphemeral ? expiryTime : null,
        attachments,
        signature: blockchainMessage.signature,
        previousHash: blockchainMessage.previousHash,
        hash: blockchainMessage.hash
      };
      
      console.log("Sending message to API with payload:", {
        conversationId: conversation.id,
        contentLength: encryptedContent.length,
        hasAttachments: attachments.length > 0,
        attachmentCount: attachments.length,
        csrfToken: csrfToken ? "available" : "missing",
        signature: blockchainMessage.signature ? "available" : "missing",
      });
      
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify(messagePayload),
      })

      // Add detailed error handling
      if (!response.ok) {
        let errorMessage = "Failed to send message";
        let errorDetails = {};
        
        try {
          const errorData = await response.json();
          console.error("API error response:", errorData);
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData;
        } catch (parseError) {
          console.error("Could not parse error response:", parseError);
          errorMessage = `${errorMessage} (Status: ${response.status} ${response.statusText})`;
        }
        
        // Log response headers for debugging
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        // console.error("Response headers:", headers);
        
        throw new Error(errorMessage, { cause: errorDetails });
      }

      console.log("Message sent successfully, parsing response...");
      const newMsg = await response.json()
      // console.log("Response parsed, new message ID:", newMsg.id);
      
      // Update UI with the decrypted message immediately
      setMessages((prev) => [...prev, newMsg])
      conversation.messages.push(newMsg)
      setDecryptedMessages((prev) => ({
        ...prev,
        [newMsg.id]: message // Use the original message text
      }));

      setMessage("")
      setAttachments([])
      setShowMediaUpload(false)
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast({
        title: "Error sending message",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAttachmentUpload = (files: { type: string; url: string; name: string; size: number }[]) => {
    setAttachments(files)
  }

  // Function to regenerate keys
  const handleRegenerateKeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/users/keypair?reset=true");
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate keys");
      }
      
      toast({
        title: "Success",
        description: "Encryption keys regenerated successfully. Reloading the page...",
      });
      
      // Reload the page to use the new keys
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Failed to regenerate keys:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate keys",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconnectSocket = () => {
    retryConnection()
    toast({
      title: "Reconnecting",
      description: "Attempting to reconnect to the messaging service...",
    })
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
          <p className="text-muted-foreground">Choose a conversation from the list or start a new one</p>
        </div>
      </div>
    )
  }

  let displayName
  let avatarSrc
  let avatarFallback

  if (conversation.isGroup) {
    displayName = conversation.name || "Group Chat"
    avatarSrc = conversation.image || "/placeholder.svg"
    avatarFallback = "GC"
  } else {
    const otherUser = conversation.participants.find((p: any) => p.userId !== currentUserId)?.user

    displayName = otherUser?.name || "Unknown User"
    avatarSrc = otherUser?.image || "/placeholder.svg"
    avatarFallback = otherUser?.name
      ? otherUser.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
      : "U"
  }

  const displayMessages = conversation.messages.map((msg: Message) => ({
    ...msg,
    content: bypassMode 
      ? (msg.content?.substring(0, 20) + "... [RAW ENCRYPTED]") 
      : (decryptedMessages[msg.id] || "Decrypting..."),
  }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatHeader conversation={conversation} currentUserId={currentUserId} />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
        {/* Validation warning */}
        {!chainValid && !bypassMode && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 my-3">
            <h4 className="font-medium">Message chain validation failed</h4>
            <p className="text-sm">The message chain integrity check has failed. Some messages may have been tampered with.</p>
            <div className="flex mt-2">
              <button
                onClick={() => setBypassMode(true)}
                className="text-xs bg-red-100 px-2 py-1 rounded hover:bg-red-200"
              >
                Show messages anyway (unsafe)
              </button>
            </div>
          </div>
        )}
        
        {/* Error decrypting */}
        {decryptionFailed && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 my-3">
            <h4 className="font-medium">Unable to decrypt messages</h4>
            <p className="text-sm">There was a problem decrypting messages with your keys.</p>
            <p className="text-xs mt-1">Try regenerating your keys or contact support.</p>
          </div>
        )}
        
        {showSocketError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 my-3">
            <h4 className="font-medium">Connection Issue</h4>
            <p className="text-sm">Unable to connect to messaging service. Real-time updates may be delayed.</p>
            <div className="flex mt-2">
              <button
                onClick={handleReconnectSocket}
                className="text-xs bg-amber-100 px-2 py-1 rounded hover:bg-amber-200"
              >
                Reconnect
              </button>
            </div>
          </div>
        )}
        
        {/* Empty conversation */}
        {!isLoading && messages.length === 0 && (
          <div className="text-center text-muted-foreground my-8">
            <p>No messages yet. Send a message to start the conversation.</p>
          </div>
        )}
        
        {/* Messages */}
        {displayMessages.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">No messages yet. Start the conversation!</div>
        ) : (
          displayMessages.map((msg: Message) => {
            const isSender = msg.senderId === currentUserId
            const isEphemeralMsg = msg.isEphemeral

            return (
              <div key={msg.id} className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
                <div className="flex items-end gap-2 max-w-[70%]">
                  {!isSender && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.sender?.image || "/placeholder.svg"} alt={msg.sender?.name || "User"} />
                      <AvatarFallback>
                        {msg.sender?.name
                          ? msg.sender.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`rounded-lg p-3 ${isSender ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {isEphemeralMsg && (
                      <div
                        className={`flex items-center text-xs mb-1 ${isSender ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {msg.expiresAt ? `Disappears ${formatDate(msg.expiresAt)}` : "Disappearing message"}
                      </div>
                    )}

                    {(() => {
                      // Check if the content is a decryption warning JSON
                      try {
                        const parsed = JSON.parse(msg.content);
                        if (parsed.decryptionWarning) {
                          return (
                            <div>
                              <div className="flex items-center mb-2">
                                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                                <p className="text-amber-600 text-sm font-medium">Decryption Issue</p>
                              </div>
                              <p className="text-muted-foreground">{parsed.decryptionWarning}</p>
                            </div>
                          );
                        }
                      } catch (e) {
                        // Not a warning JSON, continue to normal display
                      }
                      
                      // Check if message has attachments in the database
                      if (msg.attachments && msg.attachments.length > 0) {
                        console.log(`Rendering message ${msg.id} with ${msg.attachments.length} attachments:`, 
                          msg.attachments.map(a => ({ id: a.id, type: a.type, hasUrl: !!a.url })));
                        
                        // For messages with attachments, show both the text and attachments
                        return (
                          <>
                            {/* For attachment messages, still try to show text content if available */}
                            {(() => {
                              // First try to get text from decrypted message
                              try {
                                if (decryptedMessages[msg.id]) {
                                  const parsed = JSON.parse(decryptedMessages[msg.id]);
                                  if (parsed && parsed.text) {
                                    return <p className="whitespace-pre-wrap break-words">{parsed.text}</p>;
                                  }
                                }
                              } catch (e) {
                                // Silent fail - don't show unparseable content
                              }
                              
                              // Default to a simple placeholder if no text content available
                              return <p className="whitespace-pre-wrap break-words text-muted-foreground">
                                {msg.attachments.length > 1 ? `[${msg.attachments.length} attachments]` : '[Attachment]'}
                              </p>;
                            })()}
                            
                            <div className="mt-2 space-y-2">
                              {/* ALWAYS show direct attachment links at the top to ensure visibility */}
                              {msg.attachments.map((attachment: any) => (
                                <div key={`link-${attachment.id}`} className="p-2 border-2 border-primary rounded bg-primary/5">
                                  {(() => {
                                    console.log(`Direct attachment URL in chat: ${attachment.url}`);
                                    return null;
                                  })()}
                                  <div className="flex flex-col">
                                    <p className="font-medium flex items-center mb-1">
                                      {attachment.type === 'image' && <Image className="h-4 w-4 mr-1" />}
                                      {attachment.type === 'video' && <Video className="h-4 w-4 mr-1" />}
                                      {attachment.type === 'audio' && <FileAudio className="h-4 w-4 mr-1" />}
                                      {attachment.type !== 'image' && attachment.type !== 'video' && attachment.type !== 'audio' && <File className="h-4 w-4 mr-1" />}
                                      {attachment.name || `${attachment.type.charAt(0).toUpperCase()}${attachment.type.slice(1)} attachment`}
                                    </p>
                                    
                                    {attachment.type === 'image' && attachment.url && (
                                      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="mb-2">
                                        <div className="border rounded p-1 overflow-hidden hover:bg-gray-50 transition-colors">
                                          <img 
                                            src={attachment.url} 
                                            alt={attachment.name || "Image"} 
                                            className="max-w-full max-h-[100px] object-contain rounded"
                                            onError={(e) => {
                                              console.error(`Error loading image: ${attachment.url}`);
                                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                                            }}
                                          />
                                        </div>
                                      </a>
                                    )}
                                    
                                    <div className="flex space-x-2">
                                      <Button asChild variant="outline" size="sm">
                                        <a 
                                          href={attachment.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="flex items-center text-xs"
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          {attachment.type === 'image' ? 'View Image' : 'Open File'}
                                        </a>
                                      </Button>
                                      {attachment.type === 'image' && (
                                        <Button asChild variant="secondary" size="sm">
                                          <a 
                                            href={attachment.url} 
                                            download
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center text-xs"
                                          >
                                            <Download className="h-3 w-3 mr-1" />
                                            Download
                                          </a>
                                        </Button>
                                      )}
                                    </div>
                                    
                                    {!attachment.url && (
                                      <p className="text-red-500 text-xs mt-1">URL missing - check console for details</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Skip the regular MediaAttachment component for now */}
                            </div>
                          </>
                        );
                      }
                      
                      // Try to parse the decrypted content as JSON with hasAttachments flag
                      try {
                        if (decryptedMessages[msg.id]) {
                          const parsed = JSON.parse(decryptedMessages[msg.id]);
                          if (parsed && parsed.hasAttachments) {
                            // This is a message with attachments but they might not be loaded
                            return (
                              <>
                                {parsed.text && <p className="whitespace-pre-wrap break-words">{parsed.text}</p>}
                                {(!msg.attachments || msg.attachments.length === 0) && (
                                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-2 my-1 text-xs">
                                    This message has attachments that could not be loaded.
                                  </div>
                                )}
                              </>
                            );
                          }
                        }
                      } catch (e) {
                        // Not a JSON message with attachments, display as plain text
                      }
                      
                      // Display the message content as plain text
                      return <p className="whitespace-pre-wrap break-words">{decryptedMessages[msg.id] || "Decrypting..."}</p>;
                    })()}

                    <div
                      className={`text-xs mt-1 ${isSender ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {formatDate(msg.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showMediaUpload && (
        <div className="p-4 border-t border-border">
          <MediaUpload onUpload={handleAttachmentUpload} />
        </div>
      )}

      <div className="p-4 border-t">
        <div className="flex items-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Clock className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-80">
              <EphemeralMessageSettings
                isEphemeral={isEphemeral}
                expiryTime={expiryTime}
                onEphemeralChange={setIsEphemeral}
                onExpiryTimeChange={setExpiryTime}
              />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowMediaUpload(!showMediaUpload)}>
            <Paperclip className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowMediaUpload(!showMediaUpload)}>
            <Image className="h-5 w-5" />
          </Button>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[60px] resize-none"
            disabled={isLoading || decryptionFailed}
          />

          <Button
            onClick={handleSendMessage}
            disabled={(!message.trim() && attachments.length === 0) || isLoading || decryptionFailed}
            className="shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <MediaAttachment
                key={index}
                type={file.type}
                url={file.url}
                name={file.name}
                size={file.size}
                onRemove={() => {
                  const newAttachments = [...attachments]
                  newAttachments.splice(index, 1)
                  setAttachments(newAttachments)
                }}
                showRemove={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

