import { generateSessionKey, encryptSessionKey, createBlockchainMessage, encryptMessage } from "./crypto/message-chain"
import { prisma } from "./db"

interface Participant {
  id: string
  userId: string
  publicKey: string
}

// Create a new conversation with initial participants
export async function createConversation(creatorId: string, creatorPrivateKey: string, participantIds: string[]) {
  // Generate a session key for this conversation
  const sessionKey = generateSessionKey()

  // Get public keys of all participants
  const participants = await prisma.user.findMany({
    where: { id: { in: [...participantIds, creatorId] } },
    select: { id: true, publicKey: true },
  })

  // For each participant, encrypt the session key with their public key
  const sessionKeyMap = participants.map((participant) => ({
    userId: participant.id,
    encryptedSessionKey: encryptSessionKey(sessionKey, participant.publicKey),
  }))

  // Create conversation with encrypted session keys
  const conversation = await prisma.conversation.create({
    data: {
      creatorId,
      participants: {
        create: participants.map((p) => ({
          userId: p.id,
          encryptedSessionKey: sessionKeyMap.find((s) => s.userId === p.id)?.encryptedSessionKey,
        })),
      },
    },
  })

  // Create genesis block
  const genesisMessage = createBlockchainMessage(
    "Conversation started",
    creatorId,
    "0000000000000000000000000000000000000000000000000000000000000000", // genesis block
    creatorPrivateKey,
  )

  // Encrypt content with session key
  const encryptedContent = encryptMessage(genesisMessage.content, sessionKey)

  // Store first message
  await prisma.message.create({
    data: {
      id: genesisMessage.id,
      conversationId: conversation.id,
      senderId: creatorId,
      content: encryptedContent,
      signature: genesisMessage.signature,
      previousHash: genesisMessage.previousHash,
      hash: genesisMessage.hash,
      timestamp: new Date(genesisMessage.timestamp),
    },
  })

  return conversation
}

// Send a message in an existing conversation
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  senderPrivateKey: string,
  sessionKey: string,
) {
  // Get the last message in the conversation to get its hash
  const lastMessage = await prisma.message.findFirst({
    where: { conversationId },
    orderBy: { timestamp: "desc" },
    select: { hash: true },
  })

  // Default genesis hash for a new conversation
  const genesisHash = "0000000000000000000000000000000000000000";
  
  // Use the hash from the last message, or the genesis hash if there is no previous message
  const previousHash = lastMessage?.hash || genesisHash;
  
  console.log(`Creating blockchain message with previousHash: ${previousHash.substring(0, 8)}...`);

  // Create blockchain message
  const blockchainMessage = createBlockchainMessage(
    content,
    senderId,
    previousHash,
    senderPrivateKey,
  )

  // Encrypt content with session key
  const encryptedContent = encryptMessage(blockchainMessage.content, sessionKey)

  // Store message
  const message = await prisma.message.create({
    data: {
      id: blockchainMessage.id,
      conversationId,
      senderId,
      content: encryptedContent,
      signature: blockchainMessage.signature,
      previousHash: blockchainMessage.previousHash,
      hash: blockchainMessage.hash,
      timestamp: new Date(blockchainMessage.timestamp),
    },
  })

  return message
}

