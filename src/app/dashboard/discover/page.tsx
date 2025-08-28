'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'
import { UserDiscoverCard } from '@/components/dashboard/UserDiscoverCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Compass, Filter } from 'lucide-react'

type UserProfile = Database['public']['Tables']['profiles']['Row'] & {
  friendship_status?: 'none' | 'pending_sent' | 'pending_received' | 'accepted'
}

export default function DiscoverPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlineOnly, setShowOnlineOnly] = useState(false)
  const supabase = createClient()

  const loadUsers = async () => {
    if (!user) return
    
    try {
      // Get all users excluding current user
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)

      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
        setLoading(false)
        return
      }

      if (!profilesData || profilesData.length === 0) {
        setUsers([])
        setLoading(false)
        return
      }

      // Get discovery settings separately
      const { data: discoveryData } = await supabase
        .from('discovery_settings')
        .select('user_id, discoverable')

      // Get friendship statuses
      const { data: friendshipsData } = await supabase
        .from('friends')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

      // Map friendship statuses and filter discoverable users
      const usersWithStatus = profilesData.filter((profile: any) => {
        // Check if user is discoverable (default to true if no discovery settings)
        const discoverySettings = discoveryData?.find(ds => ds.user_id === profile.id)
        const isDiscoverable = discoverySettings ? discoverySettings.discoverable : true
        return isDiscoverable
      }).map((profile: any) => {
        const friendship = friendshipsData?.find(f => 
          (f.user_id === user.id && f.friend_id === profile.id) ||
          (f.friend_id === user.id && f.user_id === profile.id)
        )

        let friendship_status: UserProfile['friendship_status'] = 'none'
        if (friendship) {
          if (friendship.status === 'accepted') {
            friendship_status = 'accepted'
          } else if (friendship.user_id === user.id) {
            friendship_status = 'pending_sent'
          } else {
            friendship_status = 'pending_received'
          }
        }

        return {
          ...profile,
          friendship_status
        }
      })

      setUsers(usersWithStatus)
    } catch (error) {
      console.error('Error in loadUsers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [user])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesOnlineFilter = !showOnlineOnly || user.status === 'online'
    
    return matchesSearch && matchesOnlineFilter
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
            <Compass className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-semibold text-gray-900">Discover People</h1>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {filteredUsers.length}
            </span>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="mt-4 flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by name, username, or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showOnlineOnly ? "default" : "outline"}
            onClick={() => setShowOnlineOnly(!showOnlineOnly)}
            className={showOnlineOnly ? "bg-red-500 hover:bg-red-600" : ""}
          >
            <Filter className="w-4 h-4 mr-2" />
            Online Only
          </Button>
        </div>
      </div>

      {/* Users Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Compass className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || showOnlineOnly ? 'No users found' : 'No discoverable users'}
            </h3>
            <p className="text-gray-500">
              {searchQuery || showOnlineOnly
                ? 'Try adjusting your search or filters'
                : 'Check back later for new people to connect with'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map((user) => (
              <UserDiscoverCard key={user.id} user={user} onUpdate={loadUsers} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
