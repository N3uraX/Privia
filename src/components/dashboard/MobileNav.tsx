'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Users, Compass, UserPlus, MessageSquare, Settings } from 'lucide-react'

const navigation = [
  { name: 'Friends', href: '/dashboard/friends', icon: Users },
  { name: 'Discover', href: '/dashboard/discover', icon: Compass },
  { name: 'Requests', href: '/dashboard/requests', icon: UserPlus },
  { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function MobileNav() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const supabase = createClient()

  const loadPendingRequestsCount = async () => {
    if (!user) return

    try {
      const { count, error } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Error loading pending requests count:', error)
      } else {
        setPendingRequestsCount(count || 0)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const loadUnreadMessagesCount = async () => {
    if (!user) return

    try {
      // Get user's conversations and count unread messages
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)

      if (!participantData) return

      let totalUnread = 0
      for (const participant of participantData) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', participant.conversation_id)
          .gt('created_at', participant.last_read_at || '1970-01-01')
          .neq('sender_id', user.id)

        totalUnread += count || 0
      }

      setUnreadMessagesCount(totalUnread)
    } catch (error) {
      console.error('Error loading unread messages count:', error)
    }
  }

  useEffect(() => {
    loadPendingRequestsCount()
    loadUnreadMessagesCount()

    // Set up real-time subscription for friend requests
    const friendsChannel = supabase
      .channel('mobile-friend-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `friend_id=eq.${user?.id}`
        },
        () => {
          loadPendingRequestsCount()
        }
      )
      .subscribe()

    // Set up real-time subscription for new messages
    const messagesChannel = supabase
      .channel('mobile-unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadUnreadMessagesCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(friendsChannel)
      supabase.removeChannel(messagesChannel)
    }
  }, [user])

  return (
    <div className="bg-white border-t border-gray-200">
      <div className="grid grid-cols-5">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const showRequestsBadge = item.name === 'Requests' && pendingRequestsCount > 0
          const showChatBadge = item.name === 'Chat' && unreadMessagesCount > 0
          const showBadge = showRequestsBadge || showChatBadge
          const badgeCount = showRequestsBadge ? pendingRequestsCount : unreadMessagesCount
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-3 px-1 relative ${
                isActive
                  ? 'text-red-500 bg-red-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
              {showBadge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
