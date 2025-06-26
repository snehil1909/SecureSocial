import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcrypt"
import { db } from "@/lib/db"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import crypto from "crypto"

// Extend the next-auth session user type
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      hasEncryptionKeys?: boolean
      role?: string
    }
  }
}

// Extend JWT type
declare module "next-auth/jwt" {
  interface JWT {
    id: string
    hasEncryptionKeys?: boolean
    role?: string
    lastRefreshed?: number
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email,
          },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            publicKey: true,
            encryptedPrivateKey: true,
          },
        })

        if (!user) {
          return null
        }

        if (!user.password) {
          throw new Error("Please sign in using the provider you registered with")
        }

        const passwordMatch = await compare(
          credentials.password,
          user.password || ""
        )

        if (!passwordMatch) {
          return null
        }
        
        // Log key information for debugging
        // console.log(`[Auth ${new Date().toISOString()}] User ${user.id} logged in`);
        // console.log(`[Auth] Has encryption keys: ${!!(user.publicKey && user.encryptedPrivateKey)}`);
        if (user.publicKey) {
          // console.log(`[Auth] Public key fingerprint: ${calculateKeyFingerprint(user.publicKey)}`);
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          hasEncryptionKeys: !!(user.publicKey && user.encryptedPrivateKey),
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
        session.user.hasEncryptionKeys = token.hasEncryptionKeys || false
      }

      return session
    },
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        // Handle session updates
        return { ...token, ...session.user }
      }
      
      // If the token already has an ID and we're not forcing a refresh, return it
      if (token.id && trigger !== 'signIn') {
        // Add a timestamp to the token to track when it was refreshed
        // This avoids refreshing on every request
        const now = Date.now();
        const lastRefreshed = token.lastRefreshed as number || 0;
        
        // Only refresh the token once per hour (3600000ms)
        if (lastRefreshed && now - lastRefreshed < 3600000) {
          return token;
        }
        
        token.lastRefreshed = now;
      }
      
      // Use type assertion to avoid email null issue
      const email = token.email as string;
      
      if (!email) {
        if (user) {
          token.id = user.id
          token.lastRefreshed = Date.now();
        }
        return token;
      }
      
      const existingUser = await db.user.findFirst({
        where: {
          email: email,
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          publicKey: true,
          encryptedPrivateKey: true,
        },
      })

      if (!existingUser) {
        if (user) {
          token.id = user.id
          token.lastRefreshed = Date.now();
        }
        return token
      }
      
      // Get fresh key data every JWT refresh
      const hasEncryptionKeys = !!(existingUser.publicKey && existingUser.encryptedPrivateKey);
      
      // Log key status for debugging, but only on sign in or forced refresh
      if (trigger === 'signIn' || !token.lastRefreshed) {
        // console.log(`[JWT ${new Date().toISOString()}] Refreshing JWT for user ${existingUser.id}`);
        // console.log(`[JWT] Has encryption keys: ${hasEncryptionKeys}`);
      }
      
      return {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        picture: existingUser.image,
        hasEncryptionKeys: hasEncryptionKeys,
        lastRefreshed: Date.now()
      }
    },
  },
  events: {
    async signIn({ user }) {
      // Update last login time and check keys
      if (user.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { publicKey: true, encryptedPrivateKey: true }
          });
          
          const hasKeys = !!(dbUser?.publicKey && dbUser?.encryptedPrivateKey);
          
          await db.user.update({
            where: { id: user.id },
            data: { 
              // Update last login time
              updatedAt: new Date(),
            }
          });
          
          // console.log(`[Event:SignIn] User ${user.id} signed in, has keys: ${hasKeys}`);
        } catch (error) {
          console.error("Error updating user on sign in:", error);
        }
      }
    }
  }
}

// Helper function to calculate a key fingerprint
function calculateKeyFingerprint(key: string): string {
  // Use the imported crypto module
  const hash = crypto.createHash('sha256');
  hash.update(key);
  return hash.digest('hex').substring(0, 16);
}

