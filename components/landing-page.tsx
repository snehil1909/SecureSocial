import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, MessageCircle, ShoppingBag, Lock, Users } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">SecureSocial</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Secure Social Connections</h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
              Connect, share, and trade with end-to-end encryption and advanced security features.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="px-8">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="px-8">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
                <div className="mb-4 text-primary">
                  <MessageCircle size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">End-to-End Encrypted Messaging</h3>
                <p className="text-muted-foreground">
                  Secure private and group conversations with state-of-the-art encryption.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
                <div className="mb-4 text-primary">
                  <ShoppingBag size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">P2P Marketplace</h3>
                <p className="text-muted-foreground">Buy and sell items securely with integrated payment processing.</p>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
                <div className="mb-4 text-primary">
                  <Lock size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Advanced Security</h3>
                <p className="text-muted-foreground">
                  OTP verification, virtual keyboards, and PKI for maximum protection.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
                <div className="mb-4 text-primary">
                  <Users size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Social Features</h3>
                <p className="text-muted-foreground">Connect with friends, share media, and build your network.</p>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
                <div className="mb-4 text-primary">
                  <Shield size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure Media Sharing</h3>
                <p className="text-muted-foreground">Share photos, videos, and documents with confidence.</p>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
                <div className="mb-4 text-primary">
                  <Lock size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Identity Verification</h3>
                <p className="text-muted-foreground">Multi-factor authentication and identity validation.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">SecureSocial</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SecureSocial. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

