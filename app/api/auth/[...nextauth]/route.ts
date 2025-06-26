import NextAuth, { type NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

// Extend user type to include role
declare module "next-auth" {
  interface User {
    id: string
    email?: string | null
    name?: string | null
    role?: string
  }
  
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      role?: string
    }
  }
}

// Extend JWT to include role
declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email,
          },
        })

        if (!user || !user.password) {
          throw new Error("User not found")
        }

        // Check user status
        if (user.status !== "ACTIVE") {
          throw new Error("User account is not active")
        }

        // Check if account is locked
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          throw new Error("Account is temporarily locked")
        }

        const isCorrectPassword = await bcrypt.compare(credentials.password, user.password)

        if (!isCorrectPassword) {
          throw new Error("Invalid password")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
    // Other providers
  ],
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/error",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      // ... existing code ...
    },
    async signOut({ token }) {
      // Add sign out logging
      console.log(`[Event:SignOut] User ${token.sub} signed out at ${new Date().toISOString()}`);
    }
  },
  debug: process.env.NODE_ENV === "development",
}

// Create handler with auth options
const handler = NextAuth(authOptions);

// Export handlers for GET and POST
export { handler as GET, handler as POST };

