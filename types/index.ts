export interface Post {
  id: string;
  content: string;
  image: string | null;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  likes: Array<{ userId: string }>;
  comments: Array<{
    id: string;
    content: string;
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