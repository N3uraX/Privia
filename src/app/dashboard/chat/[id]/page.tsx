'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { TypingIndicator } from '@/components/chat/TypingIndicator'

type Message = Database['public']['Tables']['messages']['Row'] & {
  sender: Database['public']['Tables']['profiles']['Row']
  reactions?: Array<{
    emoji: string
    users: Database['public']['Tables']['profiles']['Row'][]
  }>
}

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  participants: Database['public']['Tables']['profiles']['Row'][]
}

export default function ChatConversationPage() {
  const params = useParams()
  const router = useRouter()
  const { user, supabase } = useAuth()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationId = params.id as string

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversation = async () => {
    try {
      console.log('Loading conversation:', conversationId)
      
      // Load conversation details
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      console.log('Conversation data:', conversationData, 'Error:', conversationError)

      if (conversationError) {
        console.error('Error loading conversation:', conversationError)
        router.push('/dashboard/chat')
        return
      }

      // Load participants
      const { data: participantsData } = await supabase
        .from('conversation_participants')
        .select(`
          profiles (
            id,
            display_name,
            username,
            avatar_url,
            status
          )
        `)
        .eq('conversation_id', conversationId)

      const participants = participantsData?.map((p: any) => p.profiles) || []

      // Check if current user is a participant
      if (!participants.some((p: any) => p.id === user?.id)) {
        router.push('/dashboard/chat')
        return
      }

      setConversation({
        ...conversationData,
        participants
      })
    } catch (error) {
      console.error('Error:', error)
      router.push('/dashboard/chat')
    }
  }

  const loadMessages = async () => {
    try {
      console.log('Loading messages for conversation:', conversationId)
      
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      console.log('Messages data:', messagesData, 'Error:', messagesError)

      if (messagesError) {
        console.error('Error loading messages:', messagesError)
        return
      }

      // Load reactions for each message
      const messagesWithReactions = await Promise.all(
        messagesData?.map(async (message: any) => {
          const { data: reactionsData } = await supabase
            .from('message_reactions')
            .select(`
              emoji,
              user_id,
              profiles (
                id,
                display_name,
                username,
                avatar_url
              )
            `)
            .eq('message_id', message.id)

          // Group reactions by emoji
          const reactionGroups: { [key: string]: any[] } = {}
          reactionsData?.forEach((reaction: any) => {
            if (!reactionGroups[reaction.emoji]) {
              reactionGroups[reaction.emoji] = []
            }
            reactionGroups[reaction.emoji].push(reaction.profiles)
          })

          const reactions = Object.entries(reactionGroups).map(([emoji, users]) => ({
            emoji,
            users
          }))

          return {
            ...message,
            reactions
          }
        }) || []
      )

      setMessages(messagesWithReactions)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async () => {
    if (!user) return

    try {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  useEffect(() => {
    if (!user || !conversationId) return

    loadConversation()
    loadMessages()
    markAsRead()
  }, [user, conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!conversationId) return

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          loadMessages()
          markAsRead()
        }
      )
      .subscribe()

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Load current typing indicators
          try {
            const { data: typingData } = await supabase
              .from('typing_indicators')
              .select(`
                user_id,
                is_typing,
                profiles (display_name)
              `)
              .eq('conversation_id', conversationId)
              .eq('is_typing', true)
              .neq('user_id', user?.id || '')

            const typingUserNames = typingData?.map(t => t.profiles?.display_name).filter(Boolean) || []
            setTypingUsers(typingUserNames)
          } catch (error) {
            console.error('Error loading typing indicators:', error)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(typingChannel)
    }
  }, [conversationId])

  if (loading || !conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-w-0 chat-container">
      {/* Chat Header */}
      <ChatHeader 
        conversation={conversation}
        currentUserId={user?.id || ''}
      />

      {/* Messages */}
      <div className="flex-1 overflow-hidden min-w-0">
        <MessageList 
          messages={messages}
          currentUserId={user?.id || ''}
          conversationId={conversationId}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} />
      )}

      {/* Message Input */}
      <MessageInput 
        conversationId={conversationId}
        onMessageSent={() => {
          loadMessages()
          scrollToBottom()
        }}
      />
    </div>
  )
}
