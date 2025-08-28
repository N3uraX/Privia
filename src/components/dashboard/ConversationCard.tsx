'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Database } from '@/lib/types/database'
import { 
  User, 
  Users,
  Image as ImageIcon,
  File,
  Circle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Conversation = {
  id: string
  type: 'direct' | 'group'
  name: string | null
  created_at: string
  updated_at: string
  participants: Database['public']['Tables']['profiles']['Row'][]
  last_message?: {
    content: string | null
    message_type: string
    created_at: string
    sender: Database['public']['Tables']['profiles']['Row']
  }
  unread_count: number
}

interface ConversationCardProps {
  conversation: Conversation
  currentUserId: string
}

export function ConversationCard({ conversation, currentUserId }: ConversationCardProps) {
  const getConversationName = () => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat'
    }
    
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId)
    return otherParticipant?.display_name || 'Unknown User'
  }

  const getConversationAvatar = () => {
    if (conversation.type === 'group') {
      return null // Could implement group avatars later
    }
    
    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId)
    return otherParticipant?.avatar_url || null
  }

  const getOnlineStatus = () => {
    if (conversation.type === 'group') return null
    
    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId)
    return otherParticipant?.status || 'offline'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500'
      case 'away': return 'text-yellow-500'
      default: return 'text-gray-400'
    }
  }

  const getLastMessagePreview = () => {
    if (!conversation.last_message) return 'No messages yet'
    
    const { content, message_type, sender } = conversation.last_message
    const isFromCurrentUser = sender.id === currentUserId
    const senderName = isFromCurrentUser ? 'You' : sender.display_name

    switch (message_type) {
      case 'image':
        return `${senderName}: 📷 Photo`
      case 'file':
        return `${senderName}: 📎 File`
      case 'system':
        return content || 'System message'
      default:
        return content ? `${senderName}: ${content}` : `${senderName}: sent a message`
    }
  }

  const getLastMessageIcon = () => {
    if (!conversation.last_message) return null
    
    switch (conversation.last_message.message_type) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-gray-400" />
      case 'file':
        return <File className="w-4 h-4 text-gray-400" />
      default:
        return null
    }
  }

  const status = getOnlineStatus()

  return (
    <Link href={`/dashboard/chat/${conversation.id}`}>
      <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarImage src={getConversationAvatar() || ''} />
              <AvatarFallback>
                {conversation.type === 'group' ? (
                  <Users className="w-6 h-6" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </AvatarFallback>
            </Avatar>
            {status && conversation.type === 'direct' && (
              <Circle 
                className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(status)} fill-current`}
              />
            )}
          </div>

          {/* Conversation Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={`font-medium truncate ${
                conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
              }`}>
                {getConversationName()}
              </h3>
              <div className="flex items-center space-x-2">
                {conversation.last_message && (
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(conversation.last_message.created_at), { 
                      addSuffix: false 
                    })}
                  </span>
                )}
                {conversation.unread_count > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1 mt-1">
              {getLastMessageIcon()}
              <p className={`text-sm truncate ${
                conversation.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
              }`}>
                {getLastMessagePreview()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
