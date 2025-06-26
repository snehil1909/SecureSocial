import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get current user's ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Get blocked users (both blocked by and blocking the current user)
    const blockedUsers = await prisma.report.findMany({
      where: {
        OR: [
          { reporterId: currentUser.id, type: 'USER', status: 'RESOLVED' },
          { reportedUserId: currentUser.id, type: 'USER', status: 'RESOLVED' }
        ]
      },
      select: {
        reporterId: true,
        reportedUserId: true
      }
    });

    // Create a set of blocked user IDs
    const blockedUserIds = new Set([
      ...blockedUsers.map(block => block.reporterId),
      ...blockedUsers.map(block => block.reportedUserId)
    ]);

    // Get 3 most recent users, excluding blocked users and current user
    const recentUsers = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUser.id } },
          { id: { notIn: Array.from(blockedUserIds) } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });

    return NextResponse.json(recentUsers);
  } catch (error) {
    console.error('Error fetching recent users:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 