import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateUserKeyPair, encryptPrivateKey, decryptPrivateKey } from "@/lib/crypto/keys"
import { encryptSessionKey, decryptSessionKey, generateSessionKey, encryptMessage, decryptMessage } from "@/lib/crypto/message-chain"
import crypto from "crypto"

/**
 * API endpoint for direct testing of various crypto functions with detailed logging.
 * This is for debugging purposes only and should be disabled in production.
 */
export async function POST(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    // Require authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the test data from the request
    const data = await req.json();
    const { action, privateKey, publicKey, encryptedSessionKey, sessionKey, encryptedMessage } = data;

    let results: any = {
      success: false,
      action: action,
      timestamp: new Date().toISOString(),
    };

    // Test different crypto operations based on the action
    switch (action) {
      case "decrypt_session_key":
        if (!privateKey || !encryptedSessionKey) {
          return NextResponse.json({ 
            error: "Missing required fields: privateKey, encryptedSessionKey"
          }, { status: 400 });
        }

        try {
          // console.log("Testing decryptSessionKey with provided keys");
          // console.log("Private key length:", privateKey.length);
          // console.log("Encrypted session key length:", encryptedSessionKey.length);
          
          const decryptedKey = decryptSessionKey(encryptedSessionKey, privateKey);
          
          results.success = true;
          results.decryptedKey = decryptedKey;
          results.decryptedKeyLength = decryptedKey.length;
        } catch (error: any) {
          results.error = error.message;
          results.errorStack = error.stack;
        }
        break;

      case "encrypt_session_key":
        if (!publicKey) {
          return NextResponse.json({ 
            error: "Missing required field: publicKey"
          }, { status: 400 });
        }

        try {
          // Generate new session key if not provided
          const testSessionKey = sessionKey || generateSessionKey();
          // console.log("Testing encryptSessionKey");
          // console.log("Session key length:", testSessionKey.length);
          // console.log("Public key length:", publicKey.length);
          
          const encrypted = encryptSessionKey(testSessionKey, publicKey);
          
          results.success = true;
          results.sessionKey = testSessionKey;
          results.encryptedSessionKey = encrypted;
          results.encryptedSessionKeyLength = encrypted.length;
        } catch (error: any) {
          results.error = error.message;
          results.errorStack = error.stack;
        }
        break;

      case "full_encryption_test":
        // Generate a test session key
        try {
          console.log("Running full encryption test cycle");
          
          // Generate new key pair if not provided
          let testPrivateKey = privateKey;
          let testPublicKey = publicKey;
          
          if (!testPrivateKey || !testPublicKey) {
            console.log("Generating new key pair for test");
            const keyPair = generateUserKeyPair();
            testPrivateKey = keyPair.privateKey;
            testPublicKey = keyPair.publicKey;
            results.generatedNewKeys = true;
          }
          
          // Test session key generation
          const testSessionKey = generateSessionKey();
          // console.log("Generated session key, length:", testSessionKey.length);
          
          // Test session key encryption
          const encryptedKey = encryptSessionKey(testSessionKey, testPublicKey);
          // console.log("Encrypted session key, length:", encryptedKey.length);
          
          // Test session key decryption
          const decryptedKey = decryptSessionKey(encryptedKey, testPrivateKey);
          // console.log("Decrypted session key, length:", decryptedKey.length);
          
          // Test message encryption/decryption
          const testMessage = "This is a test message for encryption debugging";
          const encryptedTestMessage = encryptMessage(testMessage, testSessionKey);
          const decryptedTestMessage = decryptMessage(encryptedTestMessage, testSessionKey);
          
          results.success = testMessage === decryptedTestMessage;
          results.keyLengths = {
            privateKey: testPrivateKey.length,
            publicKey: testPublicKey.length,
            sessionKey: testSessionKey.length,
            encryptedSessionKey: encryptedKey.length,
            decryptedSessionKey: decryptedKey.length,
          };
          results.messageEncryption = {
            originalMessage: testMessage,
            encryptedMessage: encryptedTestMessage.substring(0, 30) + "...",
            decryptedMessage: decryptedTestMessage,
            match: testMessage === decryptedTestMessage
          };
          results.sessionKeyMatch = testSessionKey === decryptedKey;
        } catch (error: any) {
          results.error = error.message;
          results.errorStack = error.stack;
        }
        break;

      case "decrypt_message":
        if (!sessionKey || !encryptedMessage) {
          return NextResponse.json({ 
            error: "Missing required fields: sessionKey, encryptedMessage"
          }, { status: 400 });
        }

        try {
          // console.log("Testing message decryption");
          const decryptedMessage = decryptMessage(encryptedMessage, sessionKey);
          
          results.success = true;
          results.decryptedMessage = decryptedMessage;
        } catch (error: any) {
          results.error = error.message;
          results.errorStack = error.stack;
        }
        break;

      default:
        return NextResponse.json({ 
          error: "Invalid action. Supported actions: decrypt_session_key, encrypt_session_key, full_encryption_test, decrypt_message"
        }, { status: 400 });
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Key test error:", error);
    return NextResponse.json(
      { error: "Test failed", message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
} 