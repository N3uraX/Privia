'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'
import { FriendRequestCard } from '@/components/dashboard/FriendRequestCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserPlus, Inbox, Send } from 'lucide-react'

type FriendRequest = {
  id: string
  user_id: string
  friend_id: string
  status: string
  created_at: string
  profile: Database['public']['Tables']['profiles']['Row']
}

export default function RequestsPage() {
  const { user } = useAuth()
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadRequests = async () => {
    if (!user) return

    try {
      // Load incoming requests
      const { data: incomingData, error: incomingError } = await supabase
        .from('friends')
        .select(`
          *,
          profile:user_id (
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
        .eq('status', 'pending')

      if (incomingError) {
        console.error('Error loading incoming requests:', incomingError)
      } else {
        setIncomingRequests(incomingData || [])
      }

      // Load outgoing requests
      const { data: outgoingData, error: outgoingError } = await supabase
        .from('friends')
        .select(`
          *,
          profile:friend_id (
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
        .eq('status', 'pending')

      if (outgoingError) {
        console.error('Error loading outgoing requests:', outgoingError)
      } else {
        setOutgoingRequests(outgoingData || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()

    if (!user) return

    // Set up real-time subscription for friend request changes
    const channel = supabase
      .channel('friend-requests-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${user.id},or,friend_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Friend requests update:', payload)
          loadRequests()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

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
        <div className="flex items-center space-x-3">
          <UserPlus className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Friend Requests</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="incoming" className="h-full flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="incoming" className="flex items-center space-x-2">
                <Inbox className="w-4 h-4" />
                <span>Incoming ({incomingRequests.length})</span>
              </TabsTrigger>
              <TabsTrigger value="outgoing" className="flex items-center space-x-2">
                <Send className="w-4 h-4" />
                <span>Sent ({outgoingRequests.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="incoming" className="flex-1 overflow-y-auto p-6 mt-0">
            {incomingRequests.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No incoming requests
                </h3>
                <p className="text-gray-500">
                  Friend requests from other users will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {incomingRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="incoming"
                    onUpdate={loadRequests}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="flex-1 overflow-y-auto p-6 mt-0">
            {outgoingRequests.length === 0 ? (
              <div className="text-center py-12">
                <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No pending requests
                </h3>
                <p className="text-gray-500">
                  Friend requests you've sent will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {outgoingRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="outgoing"
                    onUpdate={loadRequests}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
