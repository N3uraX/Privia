'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Database } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { 
  UserPlus, 
  User, 
  Clock,
  Check,
  Circle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type UserProfile = Database['public']['Tables']['profiles']['Row'] & {
  friendship_status?: 'none' | 'pending_sent' | 'pending_received' | 'accepted'
}

interface UserDiscoverCardProps {
  user: UserProfile
  onUpdate: () => void
}

export function UserDiscoverCard({ user: profileUser, onUpdate }: UserDiscoverCardProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

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

  const handleSendFriendRequest = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: profileUser.id,
          status: 'pending'
        })

      if (error) throw error

      toast.success('Friend request sent!')
      onUpdate()
    } catch (error) {
      console.error('Error sending friend request:', error)
      toast.error('Failed to send friend request')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptFriendRequest = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Update the original request to accepted
      const { error: updateError } = await supabase
        .from('friends')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profileUser.id)
        .eq('friend_id', user.id)

      if (updateError) throw updateError

      // Create reciprocal friendship so both users see each other as friends
      const { error: reciprocalError } = await supabase
        .from('friends')
        .insert({
          user_id: user.id, // The person who accepted the request
          friend_id: profileUser.id, // The person who sent the request
          status: 'accepted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (reciprocalError) {
        // Check if reciprocal already exists (to avoid duplicate key error)
        if (!reciprocalError.message?.includes('duplicate key')) {
          throw reciprocalError
        }
      }

      toast.success('Friend request accepted!')
      onUpdate()
    } catch (error) {
      console.error('Error accepting friend request:', error)
      toast.error('Failed to accept friend request')
    } finally {
      setLoading(false)
    }
  }

  const getActionButton = () => {
    switch (profileUser.friendship_status) {
      case 'accepted':
        return (
          <Button disabled className="w-full" variant="secondary">
            <Check className="w-4 h-4 mr-1" />
            Friends
          </Button>
        )
      case 'pending_sent':
        return (
          <Button disabled className="w-full" variant="secondary">
            <Clock className="w-4 h-4 mr-1" />
            Request Sent
          </Button>
        )
      case 'pending_received':
        return (
          <Button 
            onClick={handleAcceptFriendRequest} 
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            <Check className="w-4 h-4 mr-1" />
            Accept Request
          </Button>
        )
      default:
        return (
          <Button
            onClick={handleSendFriendRequest}
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add Friend
          </Button>
        )
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="text-center">
          {/* Avatar with status */}
          <div className="relative inline-block mb-3">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profileUser.avatar_url || ''} />
              <AvatarFallback>
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <Circle 
              className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(profileUser.status)} fill-current`}
            />
          </div>

          {/* User Info */}
          <h3 className="font-semibold text-gray-900 mb-1">
            {profileUser.display_name}
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            @{profileUser.username}
          </p>
          <p className="text-xs text-gray-400 mb-3">
            {getLastSeenText(profileUser.last_seen, profileUser.status)}
          </p>

          {/* Bio */}
          {profileUser.bio && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
              {profileUser.bio}
            </p>
          )}

          {/* Action Button */}
          {getActionButton()}
        </div>
      </CardContent>
    </Card>
  )
}
