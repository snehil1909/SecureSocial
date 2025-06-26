import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.userId;

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: {
        id: targetUserId,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (targetUser.status === 'SUSPENDED') {
      return NextResponse.json({ message: 'User is suspended' }, { status: 403 });
    }

    // Check if the current user is blocked by or has blocked the target user
    const blockingRelationship = await db.report.findFirst({
      where: {
        OR: [
          {
            reporterId: session.user.id,
            reportedUserId: targetUserId,
            type: 'USER',
            status: 'RESOLVED',
          },
          {
            reporterId: targetUserId,
            reportedUserId: session.user.id,
            type: 'USER',
            status: 'RESOLVED',
          },
        ],
      },
    });

    if (blockingRelationship) {
      return NextResponse.json({ message: 'User is blocked' }, { status: 403 });
    }

    // Get user's posts
    const posts = await db.post.findMany({
      where: {
        authorId: targetUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        comments: true,
        likes: true,
      },
    });

    // Transform posts to include counts
    const transformedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      image: post.image,
      authorId: post.authorId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      commentsCount: post.comments.length,
      likesCount: post.likes.length,
    }));

    return NextResponse.json(transformedPosts);
  } catch (error) {
    console.error('Get user posts error:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching user posts' },
      { status: 500 }
    );
  }
} 