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

    const currentUserId = session.user.id;
    const targetUserId = params.userId;

    // Check if the current user is following the target user
    const follow = await db.follow.findFirst({
      where: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    return NextResponse.json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Get follow status error:', error);
    return NextResponse.json(
      { message: 'An error occurred while checking follow status' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = session.user.id;
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

    // Check if already following
    const existingFollow = await db.follow.findFirst({
      where: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    if (existingFollow) {
      // Unfollow
      await db.follow.delete({
        where: {
          id: existingFollow.id,
        },
      });
      return NextResponse.json({ isFollowing: false });
    } else {
      // Follow
      await db.follow.create({
        data: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      });
      return NextResponse.json({ isFollowing: true });
    }
  } catch (error) {
    console.error('Toggle follow status error:', error);
    return NextResponse.json(
      { message: 'An error occurred while updating follow status' },
      { status: 500 }
    );
  }
} 