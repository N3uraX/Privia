'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Database } from '@/lib/types/database'
import { ConversationCard } from '@/components/dashboard/ConversationCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, MessageSquare, Plus } from 'lucide-react'

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

export default function ChatPage() {
  const { user, supabase } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadConversations = async () => {
    if (!user) {
      console.log('No user found, cannot load conversations')
      return
    }

    try {
      console.log('Loading conversations for user:', user.id)
      
      // Get user's conversations
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          last_read_at,
          conversations!inner (
            id,
            type,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)

      console.log('Participant data:', participantData, 'Error:', participantError)

      if (participantError) {
        console.error('Error loading conversations:', participantError)
        return
      }

      // Handle case where user has no conversations
      if (!participantData || participantData.length === 0) {
        setConversations([])
        return
      }

      const conversationsWithDetails = await Promise.all(
        participantData?.map(async (participant: any) => {
          const conversation = participant.conversations

          // Get all participants for this conversation
          const { data: allParticipants } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              profiles (
                id,
                display_name,
                username,
                avatar_url,
                status
              )
            `)
            .eq('conversation_id', conversation.id)

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select(`
              content,
              message_type,
              created_at,
              sender:sender_id (
                id,
                display_name,
                username,
                avatar_url
              )
            `)
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(1)

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversation.id)
            .gt('created_at', participant.last_read_at || '1970-01-01')

          return {
            ...conversation,
            participants: allParticipants?.map((p: any) => p.profiles) || [],
            last_message: lastMessage?.[0] ? {
              content: lastMessage[0].content,
              message_type: lastMessage[0].message_type,
              created_at: lastMessage[0].created_at,
              sender: lastMessage[0].sender
            } : undefined,
            unread_count: unreadCount || 0
          }
        }) || []
      )

      // Sort by last message time
      conversationsWithDetails.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.updated_at
        const bTime = b.last_message?.created_at || b.updated_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

      setConversations(conversationsWithDetails)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConversations()

    // Subscribe to new messages for real-time updates
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat'
    }
    
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants.find(p => p.id !== user?.id)
    return otherParticipant?.display_name || 'Unknown User'
  }

  const filteredConversations = conversations.filter(conversation => {
    const name = getConversationName(conversation)
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

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
            <MessageSquare className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {conversations.length}
            </span>
          </div>
          <Button size="sm" className="bg-red-500 hover:bg-red-600">
            <Plus className="w-4 h-4 mr-1" />
            New Chat
          </Button>
        </div>
        
        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Start a conversation by messaging a friend'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                currentUserId={user?.id || ''}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
