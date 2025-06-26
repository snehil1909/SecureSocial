import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import ProfileForm from "@/components/profile-form"

export const metadata: Metadata = {
  title: "Profile | FCS Marketplace",
  description: "Manage your profile settings",
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user) {
    return null
  }

  // Get user with followers and following counts
  const userData = await db.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      balance: true,
      publicKey: true,
      encryptedPrivateKey: true,
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  })

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      <ProfileForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          balance: userData?.balance,
          publicKey: userData?.publicKey,
          encryptedPrivateKey: userData?.encryptedPrivateKey,
        }}
        followersCount={userData?._count.followers || 0}
        followingCount={userData?._count.following || 0}
      />
    </div>
  )
}

