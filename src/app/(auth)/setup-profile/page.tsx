'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { User, Camera, Check } from 'lucide-react'

export default function SetupProfilePage() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    // Set initial display name from auth metadata
    if (user.user_metadata?.display_name) {
      setDisplayName(user.user_metadata.display_name)
    }
  }, [user, router])

  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    setCheckingUsername(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single()

      setUsernameAvailable(!data)
    } catch {
      // If no data found, username is available
      setUsernameAvailable(true)
    } finally {
      setCheckingUsername(false)
    }
  }, [supabase])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username, checkUsernameAvailability])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName,
          username: username.toLowerCase(),
          bio: bio || null,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })

      if (profileError) {
        toast.error(profileError.message)
        return
      }

      // Create discovery settings
      const { error: discoveryError } = await supabase
        .from('discovery_settings')
        .insert({
          user_id: user.id,
          discoverable: true,
          location_sharing: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (discoveryError) {
        console.error('Discovery settings error:', discoveryError)
        // Don't block profile creation for this
      }

      await refreshProfile()
      toast.success('Profile created successfully!')
      router.push('/dashboard')
    } catch {
      toast.error('Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Complete Your Profile</CardTitle>
          <CardDescription className="text-center">
            Let&apos;s set up your OffGrid profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 bg-red-500 rounded-full p-1.5 text-white hover:bg-red-600"
                >
                  <Camera className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="How should people see your name?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a unique username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  className={`pr-8 ${
                    usernameAvailable === true ? 'border-green-500' : 
                    usernameAvailable === false ? 'border-red-500' : ''
                  }`}
                  required
                  minLength={3}
                />
                {checkingUsername && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  </div>
                )}
                {usernameAvailable === true && (
                  <Check className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-500 w-4 h-4" />
                )}
                {usernameAvailable === false && (
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 text-xs">✗</span>
                )}
              </div>
              {usernameAvailable === false && (
                <p className="text-xs text-red-500">Username is already taken</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell people a bit about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 text-right">{bio.length}/200</p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-red-500 hover:bg-red-600" 
              disabled={loading || !usernameAvailable || checkingUsername}
            >
              {loading ? 'Creating Profile...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
