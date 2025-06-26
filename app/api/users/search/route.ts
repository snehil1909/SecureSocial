import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    //console.log('Searching for users with query:', query);
    
    // First, let's check how many active users exist in total
    const totalActiveUsers = await db.user.count({
      where: {
        status: 'ACTIVE',
      }
    });
    //console.log('Total active users in database:', totalActiveUsers);

    // Search for users by name or email with improved partial matching
    const users = await db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              // Add startsWith for better partial matching
              {
                name: {
                  startsWith: query,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  startsWith: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
          {
            status: 'ACTIVE',
          },
          {
            NOT: {
              id: session.user.id,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        publicKey: true,
        status: true,
      },
      take: 50,
      orderBy: [
        // Prioritize exact matches first
        {
          name: 'asc',
        },
      ],
    });

    //console.log('Found users:', users.length);
    //console.log('Search results:', users);

    // Transform the users to include a flag for whether they have encryption keys
    const enhancedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      hasKeys: !!user.publicKey,
      status: user.status,
    }));

    return NextResponse.json({
      users: enhancedUsers,
    });
  } catch (error) {
    //console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
} 