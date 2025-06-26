import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import FeedSection from "@/components/feed-section"
import SuggestedUsers from "@/components/suggested-users"
import NotificationsWidget from "@/components/notifications-widget"
import CreatePost from "@/components/CreatePost"

interface ExtendedSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  }
}

interface Post {
  id: string;
  content: string;
  image: string | null;
  createdAt: Date;
  authorId: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  likes: Array<{ userId: string }>;
  comments: Array<{
    id: string;
    content: string;
    authorId: string;
    author: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }>;
  _count: {
    likes: number;
    comments: number;
  };
}

export default async function DashboardPage() {
  const session = (await getServerSession(authOptions)) as ExtendedSession | null

  if (!session || !session.user) {
    redirect("/login")
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      following: true,
      followers: true,
    },
  })

  if (!user) {
    redirect("/login")
  }

  // Fetch initial posts with proper relations
  const initialPosts = await db.post.findMany({
    where: {
      OR: [
        { authorId: user.id },
        {
          author: {
            followers: {
              some: {
                followerId: user.id
              }
            }
          }
        }
      ]
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      likes: {
        select: {
          userId: true,
        },
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  }) as unknown as Post[]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 space-y-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <CreatePost />
        </div>
        <FeedSection initialPosts={initialPosts} />
      </div>
      <div className="space-y-4">
        <SuggestedUsers currentUser={user} />
        <NotificationsWidget userId={user.id} />
      </div>
    </div>
  )
}

