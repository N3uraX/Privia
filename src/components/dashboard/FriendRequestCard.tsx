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
  Check, 
  X, 
  User, 
  Circle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type FriendRequest = {
  id: string
  user_id: string
  friend_id: string
  status: string
  created_at: string
  profile: Database['public']['Tables']['profiles']['Row']
}

interface FriendRequestCardProps {
  request: FriendRequest
  type: 'incoming' | 'outgoing'
  onUpdate: () => void
}

export function FriendRequestCard({ request, type, onUpdate }: FriendRequestCardProps) {
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

  const handleAcceptRequest = async () => {
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
        .eq('id', request.id)

      if (updateError) throw updateError

      // Create reciprocal friendship so both users see each other as friends
      const { error: reciprocalError } = await supabase
        .from('friends')
        .insert({
          user_id: request.friend_id, // The person who received the request
          friend_id: request.user_id, // The person who sent the request
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
      console.error('Error accepting request:', error)
      toast.error('Failed to accept friend request')
    } finally {
      setLoading(false)
    }
  }

  const handleDeclineRequest = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', request.id)

      if (error) throw error

      toast.success('Friend request declined')
      onUpdate()
    } catch (error) {
      console.error('Error declining request:', error)
      toast.error('Failed to decline friend request')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', request.id)

      if (error) throw error

      toast.success('Friend request cancelled')
      onUpdate()
    } catch (error) {
      console.error('Error cancelling request:', error)
      toast.error('Failed to cancel friend request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* Avatar with status */}
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarImage src={request.profile.avatar_url || ''} />
              <AvatarFallback>
                <User className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            <Circle 
              className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(request.profile.status)} fill-current`}
            />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {request.profile.display_name}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              @{request.profile.username}
            </p>
            <p className="text-xs text-gray-400">
              {getLastSeenText(request.profile.last_seen, request.profile.status)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Bio */}
        {request.profile.bio && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">
            {request.profile.bio}
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex space-x-2">
          {type === 'incoming' ? (
            <>
              <Button
                size="sm"
                onClick={handleAcceptRequest}
                disabled={loading}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <Check className="w-4 h-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeclineRequest}
                disabled={loading}
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Decline
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelRequest}
              disabled={loading}
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel Request
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
