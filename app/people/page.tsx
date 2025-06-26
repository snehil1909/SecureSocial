"use client"

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import UserProfile from '@/components/people/UserProfile';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export default function PeoplePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch recent users on component mount
  useEffect(() => {
    const fetchRecentUsers = async () => {
      try {
        const response = await fetch('/api/users/recent');
        const data = await response.json();
        setRecentUsers(data);
      } catch (error) {
        console.error('Error fetching recent users:', error);
      }
    };

    fetchRecentUsers();
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }
  
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
  
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        console.error("Unexpected API response:", data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
  };

  const renderUserCard = (user: User) => (
    <Card 
      key={user.id}
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => handleUserClick(user.id)}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar>
          <AvatarImage src={user.image || ''} alt={user.name || ''} />
          <AvatarFallback>{user.name?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">{user.name}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Find People</h1>
        
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
          <Input
            placeholder="Search people by name or email..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {searchQuery ? (
              <div className="space-y-4">
                {users.map(renderUserCard)}
                {users.length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    No users found
                  </div>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold">Recent Users</h2>
                <div className="space-y-4">
                  {recentUsers.map(renderUserCard)}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <Dialog 
        open={!!selectedUserId} 
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      >
        <DialogContent className="sm:max-w-4xl">
          {selectedUserId && (
            <UserProfile 
              userId={selectedUserId}
              onClose={() => setSelectedUserId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

