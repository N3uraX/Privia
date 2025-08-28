'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Database } from '@/lib/types/database'
import { 
  ArrowLeft, 
  MoreVertical, 
  Phone, 
  Video, 
  User, 
  Users,
  Circle,
  Settings,
  UserMinus
} from 'lucide-react'

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  participants: Database['public']['Tables']['profiles']['Row'][]
}

interface ChatHeaderProps {
  conversation: Conversation
  currentUserId: string
}

export function ChatHeader({ conversation, currentUserId }: ChatHeaderProps) {
  const router = useRouter()

  const getConversationName = () => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat'
    }
    
    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId)
    return otherParticipant?.display_name || 'Unknown User'
  }

  const getConversationAvatar = () => {
    if (conversation.type === 'group') {
      return null
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online'
      case 'away': return 'Away'
      default: return 'Offline'
    }
  }

  const status = getOnlineStatus()

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 min-w-0">
      <div className="flex items-center justify-between min-w-0">
        {/* Left side - Back button and conversation info */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/chat')}
            className="lg:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={getConversationAvatar() || ''} />
              <AvatarFallback>
                {conversation.type === 'group' ? (
                  <Users className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </AvatarFallback>
            </Avatar>
            {status && conversation.type === 'direct' && (
              <Circle 
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(status)} fill-current bg-white rounded-full`}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-gray-900 truncate">
              {getConversationName()}
            </h2>
            {status && conversation.type === 'direct' && (
              <p className="text-sm text-gray-500 truncate">
                {getStatusText(status)}
              </p>
            )}
            {conversation.type === 'group' && (
              <p className="text-sm text-gray-500 truncate">
                {conversation.participants.length} members
              </p>
            )}
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button variant="ghost" size="sm" className="hidden sm:flex">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:flex">
            <Video className="w-4 h-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Conversation Settings
              </DropdownMenuItem>
              {conversation.type === 'direct' && (
                <DropdownMenuItem className="text-red-600">
                  <UserMinus className="w-4 h-4 mr-2" />
                  Block User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
