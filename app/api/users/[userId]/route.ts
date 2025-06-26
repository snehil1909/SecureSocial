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

    // Get user data with counts
    const user = await db.user.findUnique({
      where: {
        id: targetUserId,
      },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
            products: true,
          },
        },
        posts: {
          take: 5,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            },
            comments: true,
            likes: true,
          }
        },
        products: {
          take: 5,
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            images: true,
            category: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json({ message: 'User is suspended' }, { status: 403 });
    }

    // Transform the response to match the expected format
    const transformedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      status: user.status,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: user._count.posts,
      productsCount: user._count.products,
      recentPosts: user.posts.map(post => ({
        id: post.id,
        content: post.content,
        image: post.image,
        createdAt: post.createdAt,
        author: post.author,
        commentsCount: post.comments.length,
        likesCount: post.likes.length
      })),
      recentProducts: user.products.map(product => ({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        condition: product.condition,
        status: product.status,
        images: product.images,
        category: product.category
      }))
    };

    return NextResponse.json(transformedUser);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
} 