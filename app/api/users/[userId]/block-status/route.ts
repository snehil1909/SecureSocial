import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession();
    const { userId: targetUserId } = await Promise.resolve(params);
    
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return new NextResponse('User not found', { status: 404 });
    }

    const block = await prisma.report.findFirst({
      where: {
        reporterId: currentUser.id,
        reportedUserId: targetUserId,
        type: 'USER',
        status: 'RESOLVED'
      }
    });

    return NextResponse.json({ isBlocked: !!block });
  } catch (error) {
    console.error('Error checking block status:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession();
    const { userId: targetUserId } = await Promise.resolve(params);
    
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return new NextResponse('User not found', { status: 404 });
    }

    const existingBlock = await prisma.report.findFirst({
      where: {
        reporterId: currentUser.id,
        reportedUserId: targetUserId,
        type: 'USER',
        status: 'RESOLVED'
      }
    });

    if (existingBlock) {
      await prisma.report.delete({
        where: {
          id: existingBlock.id
        }
      });
      return NextResponse.json({ isBlocked: false });
    } else {
      await prisma.report.create({
        data: {
          type: 'USER',
          reason: 'Blocked by user',
          status: 'RESOLVED',
          reporterId: currentUser.id,
          reportedUserId: targetUserId
        }
      });
      return NextResponse.json({ isBlocked: true });
    }
  } catch (error) {
    console.error('Error toggling block status:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 