'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Database } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { 
  MessageSquare, 
  MoreHorizontal, 
  User, 
  UserMinus,
  Circle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Friend = Database['public']['Tables']['profiles']['Row']

interface FriendCardProps {
  friend: Friend
}

export function FriendCard({ friend }: FriendCardProps) {
  const { user, supabase } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500'
      case 'away': return 'text-yellow-500'
      default: return 'text-gray-400'
    }
  }

  const getLastSeenText = (lastSeen: string | null, status: string) => {
    if (status === 'online') return 'Online'
    if (!lastSeen) return 'Last seen unknown'
    return `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`
  }

  const handleStartChat = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      console.log('Starting chat with friend:', friend.id, 'current user:', user.id)

      // Use the database function to find or create conversation
      const { data: conversationId, error: rpcError } = await supabase
        .rpc('get_or_create_direct_conversation', {
          user1_id: user.id,
          user2_id: friend.id
        })

      if (rpcError) {
        console.error('RPC Error:', rpcError)
        throw new Error(`Failed to get or create conversation: ${rpcError.message}`)
      }

      if (!conversationId) {
        throw new Error('No conversation ID returned from database function')
      }

      console.log('Got conversation ID:', conversationId)
      router.push(`/dashboard/chat/${conversationId}`)
    } catch (error) {
      console.error('Error starting chat:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to start chat: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friend.id}),and(user_id.eq.${friend.id},friend_id.eq.${user.id})`)

      if (error) throw error

      toast.success('Friend removed')
      // Refresh the page to update the friends list
      window.location.reload()
    } catch (error) {
      console.error('Error removing friend:', error)
      toast.error('Failed to remove friend')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={friend.avatar_url || ''} />
                <AvatarFallback>
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <Circle 
                className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(friend.status)} fill-current`}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {friend.display_name}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                @{friend.username}
              </p>
              <p className="text-xs text-gray-400">
                {getLastSeenText(friend.last_seen, friend.status)}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleStartChat} disabled={loading}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleRemoveFriend} 
                disabled={loading}
                className="text-red-600"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Remove Friend
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {friend.bio && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">
            {friend.bio}
          </p>
        )}

        <div className="mt-3 flex space-x-2">
          <Button
            size="sm"
            onClick={handleStartChat}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Message
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
