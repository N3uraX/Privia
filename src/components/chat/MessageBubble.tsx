'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  MoreHorizontal, 
  User, 
  Reply,
  Copy,
  Trash2,
  Download,
  Clock,
  Image as ImageIcon,
  File,
  Edit,
  Check,
  X
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Message = Database['public']['Tables']['messages']['Row'] & {
  sender: Database['public']['Tables']['profiles']['Row']
  reactions?: Array<{
    emoji: string
    users: Database['public']['Tables']['profiles']['Row'][]
  }>
}

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  showTimestamp: boolean
  conversationId: string
}

const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '😡']

export function MessageBubble({ 
  message, 
  isOwn, 
  showAvatar, 
  showTimestamp,
  conversationId 
}: MessageBubbleProps) {
  const { user } = useAuth()
  const [showReactions, setShowReactions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content || '')
  const supabase = createClient()

  const isEphemeral = message.ephemeral_expires_at && new Date(message.ephemeral_expires_at) > new Date()
  const isExpired = message.ephemeral_expires_at && new Date(message.ephemeral_expires_at) <= new Date()
  const canEdit = isOwn && message.message_type === 'text' && 
    new Date(message.created_at) > new Date(Date.now() - 5 * 60 * 1000) // 5 minute edit window

  const handleReaction = async (emoji: string) => {
    if (!user) return

    setLoading(true)
    try {
      // Check if user already reacted with this emoji
      const existingReaction = message.reactions?.find(r => 
        r.emoji === emoji && r.users.some(u => u.id === user.id)
      )

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', message.id)
          .eq('user_id', user.id)
          .eq('emoji', emoji)

        if (error) throw error
      } else {
        // Add reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: message.id,
            user_id: user.id,
            emoji
          })

        if (error) throw error
      }

      // Refresh the page to update reactions
      window.location.reload()
    } catch (error) {
      console.error('Error handling reaction:', error)
      toast.error('Failed to add reaction')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyMessage = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
      toast.success('Message copied to clipboard')
    }
  }

  const handleEditMessage = async () => {
    if (!user || !editedContent.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: editedContent.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', message.id)
        .eq('sender_id', user.id)

      if (error) throw error

      toast.success('Message edited')
      setEditing(false)
      // Refresh to show updated message
      window.location.reload()
    } catch (error) {
      console.error('Error editing message:', error)
      toast.error('Failed to edit message')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setEditedContent(message.content || '')
  }

  const handleDeleteMessage = async () => {
    if (!user || message.sender_id !== user.id) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_deleted: true,
          content: '[Message deleted]',
          file_url: null
        })
        .eq('id', message.id)

      if (error) throw error

      toast.success('Message deleted')
      // Refresh to show updated message
      window.location.reload()
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
    } finally {
      setLoading(false)
    }
  }

  const renderMessageContent = () => {
    if (isExpired && message.message_type !== 'text') {
      return (
        <div className="flex items-center space-x-2 text-gray-500 italic">
          <Clock className="w-4 h-4" />
          <span>This content has expired</span>
        </div>
      )
    }

    switch (message.message_type) {
      case 'image':
        return (
          <div className="max-w-sm">
            {message.file_url && !isExpired ? (
              <img 
                src={message.file_url} 
                alt="Shared image"
                className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90"
                onClick={() => window.open(message.file_url!, '_blank')}
              />
            ) : (
              <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg">
                <ImageIcon className="w-5 h-5 text-gray-500" />
                <span className="text-gray-500">
                  {isEphemeral ? `Image expires ${formatDistanceToNow(new Date(message.ephemeral_expires_at!))}` : 'Image'}
                </span>
              </div>
            )}
          </div>
        )
      
      case 'file':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg max-w-sm">
            <File className="w-5 h-5 text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {message.file_name || 'Unknown file'}
              </p>
              {message.file_size && (
                <p className="text-xs text-gray-500">
                  {(message.file_size / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
            </div>
            {message.file_url && !isExpired && (
              <Button size="sm" variant="ghost" onClick={() => window.open(message.file_url!, '_blank')}>
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        )
      
      default:
        return (
          <div>
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="text-sm resize-none"
                  rows={2}
                  disabled={loading}
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleEditMessage}
                    disabled={loading || !editedContent.trim()}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={loading}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm">
                  {message.is_deleted ? (
                    <span className="italic text-gray-500">[Message deleted]</span>
                  ) : (
                    message.content
                  )}
                  {message.is_edited && !message.is_deleted && (
                    <span className="text-xs text-gray-400 ml-2">(edited)</span>
                  )}
                </p>
                {isEphemeral && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Expires {formatDistanceToNow(new Date(message.ephemeral_expires_at!))}
                  </p>
                )}
              </>
            )}
          </div>
        )
    }
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group min-w-0`}>
      <div className={`flex space-x-2 max-w-xs lg:max-w-md min-w-0 message-bubble ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        {!isOwn && (
          <div className="flex-shrink-0">
            {showAvatar ? (
              <Avatar className="w-8 h-8">
                <AvatarImage src={message.sender.avatar_url || ''} />
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-8 h-8" />
            )}
          </div>
        )}

        {/* Message Content */}
        <div className="flex flex-col">
          {/* Sender name and timestamp */}
          {!isOwn && showAvatar && (
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-medium text-gray-700">
                {message.sender.display_name}
              </span>
              {showTimestamp && (
                <span className="text-xs text-gray-400">
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`relative px-3 py-2 rounded-lg ${
              isOwn
                ? 'bg-red-500 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            {renderMessageContent()}

            {/* Message actions */}
            <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
              <div className="flex items-center space-x-1 bg-white shadow-lg rounded-lg p-1">
                {/* Quick reactions */}
                {commonReactions.slice(0, 3).map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    onClick={() => handleReaction(emoji)}
                    disabled={loading}
                  >
                    {emoji}
                  </Button>
                ))}
                
                {/* More actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleReaction('👍')}>
                      <span className="mr-2">👍</span> React
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyMessage}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </DropdownMenuItem>
                    {isOwn && canEdit && !message.is_deleted && (
                      <DropdownMenuItem 
                        onClick={() => setEditing(true)}
                        disabled={loading}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {isOwn && !message.is_deleted && (
                      <DropdownMenuItem 
                        onClick={handleDeleteMessage}
                        className="text-red-600"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                    reaction.users.some(u => u.id === user?.id)
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={loading}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.users.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Timestamp for own messages */}
          {isOwn && showTimestamp && (
            <span className="text-xs text-gray-400 mt-1 text-right">
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
