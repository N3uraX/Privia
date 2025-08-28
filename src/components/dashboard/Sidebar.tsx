'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  Compass, 
  UserPlus, 
  MessageSquare, 
  Search,
  Settings,
  LogOut,
  User,
  Shield
} from 'lucide-react'

const navigation = [
  { name: 'Friends', href: '/dashboard/friends', icon: Users },
  { name: 'Discover', href: '/dashboard/discover', icon: Compass },
  { name: 'Requests', href: '/dashboard/requests', icon: UserPlus },
  { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
]

export function Sidebar() {
  const { user, profile, signOut } = useAuth()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const supabase = createClient()

  const handleSignOut = async () => {
    await signOut()
  }

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
      .channel('friend-requests')
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
      .channel('unread-messages')
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
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">OffGrid</h1>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const showRequestsBadge = item.name === 'Requests' && pendingRequestsCount > 0
          const showChatBadge = item.name === 'Chat' && unreadMessagesCount > 0
          const showBadge = showRequestsBadge || showChatBadge
          const badgeCount = showRequestsBadge ? pendingRequestsCount : unreadMessagesCount
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start relative ${
                  isActive 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.name}
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Button>
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* User Profile */}
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback>
              <User className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.display_name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              @{profile?.username}
            </p>
          </div>
        </div>
        
        <div className="space-y-1">
          <Link href="/dashboard/settings">
            <Button variant="ghost" className="w-full justify-start text-gray-700">
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-gray-700 hover:text-red-600"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
