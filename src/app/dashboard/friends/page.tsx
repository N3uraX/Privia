'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'
import { FriendCard } from '@/components/dashboard/FriendCard'
import { Input } from '@/components/ui/input'
import { Search, Users } from 'lucide-react'

type Friend = Database['public']['Tables']['profiles']['Row'] & {
  friendship_status: string
}

export default function FriendsPage() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const loadFriends = async () => {
    if (!user) return

    try {
      // Load friends where current user initiated the friendship
      const { data: friendsAsUser, error: error1 } = await supabase
        .from('friends')
        .select(`
          *,
          friend:friend_id (
            id,
            display_name,
            username,
            bio,
            avatar_url,
            status,
            last_seen
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')

      // Load friends where current user received the friendship
      const { data: friendsAsFriend, error: error2 } = await supabase
        .from('friends')
        .select(`
          *,
          friend:user_id (
            id,
            display_name,
            username,
            bio,
            avatar_url,
            status,
            last_seen
          )
        `)
        .eq('friend_id', user.id)
        .eq('status', 'accepted')

      if (error1) {
        console.error('Error loading friends (as user):', error1)
      }
      if (error2) {
        console.error('Error loading friends (as friend):', error2)
      }

      // Combine both directions and remove duplicates
      const allFriends: Friend[] = []
      
      // Add friends where user initiated
      if (friendsAsUser) {
        friendsAsUser.forEach((friendship: any) => {
          if (friendship.friend) {
            allFriends.push({
              ...friendship.friend,
              friendship_status: friendship.status
            })
          }
        })
      }

      // Add friends where user received
      if (friendsAsFriend) {
        friendsAsFriend.forEach((friendship: any) => {
          if (friendship.friend) {
            // Check if this friend is already in the list to avoid duplicates
            const existingFriend = allFriends.find(f => f.id === friendship.friend.id)
            if (!existingFriend) {
              allFriends.push({
                ...friendship.friend,
                friendship_status: friendship.status
              })
            }
          }
        })
      }

      setFriends(allFriends)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFriends()

    if (!user) return

    // Set up real-time subscription for friendship changes
    const channel = supabase
      .channel('friends-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${user.id},or,friend_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Friends update:', payload)
          loadFriends()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const filteredFriends = friends.filter(friend =>
    friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-semibold text-gray-900">Friends</h1>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {friends.length}
            </span>
          </div>
        </div>
        
        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No friends found' : 'No friends yet'}
            </h3>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Start by discovering new people in the Discover tab'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFriends.map((friend) => (
              <FriendCard key={friend.id} friend={friend} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
