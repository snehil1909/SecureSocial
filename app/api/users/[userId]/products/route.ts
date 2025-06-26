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

    // Check if the requesting user has blocked or been blocked by the target user
    const blockRelation = await db.report.findFirst({
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

    if (blockRelation) {
      return NextResponse.json([]);
    }

    // Get user's active products
    const products = await db.product.findMany({
      where: {
        sellerId: targetUserId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        images: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Get user products error:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching user products' },
      { status: 500 }
    );
  }
} 