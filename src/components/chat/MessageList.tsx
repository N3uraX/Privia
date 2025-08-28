'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { Database } from '@/lib/types/database'

type Message = Database['public']['Tables']['messages']['Row'] & {
  sender: Database['public']['Tables']['profiles']['Row']
  reactions?: Array<{
    emoji: string
    users: Database['public']['Tables']['profiles']['Row'][]
  }>
}

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  conversationId: string
}

export function MessageList({ messages, currentUserId, conversationId }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const shouldShowAvatar = (message: Message, index: number) => {
    if (message.sender_id === currentUserId) return false
    if (index === messages.length - 1) return true
    
    const nextMessage = messages[index + 1]
    return !nextMessage || nextMessage.sender_id !== message.sender_id
  }

  const shouldShowTimestamp = (message: Message, index: number) => {
    if (index === 0) return true
    
    const prevMessage = messages[index - 1]
    const currentTime = new Date(message.created_at)
    const prevTime = new Date(prevMessage.created_at)
    
    // Show timestamp if more than 5 minutes apart
    return currentTime.getTime() - prevTime.getTime() > 5 * 60 * 1000
  }

  const getDateSeparator = (message: Message, index: number) => {
    if (index === 0) return new Date(message.created_at).toDateString()
    
    const prevMessage = messages[index - 1]
    const currentDate = new Date(message.created_at).toDateString()
    const prevDate = new Date(prevMessage.created_at).toDateString()
    
    return currentDate !== prevDate ? currentDate : null
  }

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0"
    >
      {messages.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((message, index) => {
          const dateSeparator = getDateSeparator(message, index)
          
          return (
            <div key={message.id}>
              {/* Date Separator */}
              {dateSeparator && (
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {dateSeparator === new Date().toDateString() 
                      ? 'Today' 
                      : dateSeparator === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
                      ? 'Yesterday'
                      : new Date(dateSeparator).toLocaleDateString()
                    }
                  </div>
                </div>
              )}
              
              {/* Message */}
              <MessageBubble
                message={message}
                isOwn={message.sender_id === currentUserId}
                showAvatar={shouldShowAvatar(message, index)}
                showTimestamp={shouldShowTimestamp(message, index)}
                conversationId={conversationId}
              />
            </div>
          )
        })
      )}
    </div>
  )
}
