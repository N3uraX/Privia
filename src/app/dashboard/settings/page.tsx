'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { 
  Settings as SettingsIcon, 
  User, 
  Camera, 
  Shield, 
  Bell, 
  Eye,
  EyeOff,
  Check,
  Save,
  Upload
} from 'lucide-react'

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const supabase = createClient()

  // Profile settings
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // Privacy settings
  const [discoverable, setDiscoverable] = useState(true)
  const [showOnlineStatus, setShowOnlineStatus] = useState(true)
  const [privacyMode, setPrivacyMode] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name)
      setUsername(profile.username || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || '')
      setPrivacyMode(profile.privacy_mode)
      setShowOnlineStatus(profile.status !== 'offline')
    }
  }, [profile])

  useEffect(() => {
    const loadDiscoverySettings = async () => {
      if (!user) return

      const { data } = await supabase
        .from('discovery_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setDiscoverable(data.discoverable)
      }
    }

    loadDiscoverySettings()
  }, [user, supabase])

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3 || username === profile?.username) {
      setUsernameAvailable(null)
      return
    }

    setCheckingUsername(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .neq('id', user?.id || '')
        .single()

      setUsernameAvailable(!data)
    } catch (error) {
      setUsernameAvailable(true)
    } finally {
      setCheckingUsername(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username && username !== profile?.username) {
        checkUsernameAvailability(username)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username, profile?.username])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP, or GIF)')
      return
    }

    setUploadingImage(true)
    const uploadToastId = 'upload-' + Date.now()
    toast.loading('Uploading image...', { id: uploadToastId })
    
    try {
      // Delete old avatar if exists
      if (avatarUrl) {
        try {
          // Extract path from URL more reliably
          const url = new URL(avatarUrl)
          const pathParts = url.pathname.split('/')
          const bucketIndex = pathParts.findIndex(part => part === 'avatars')
          if (bucketIndex >= 0 && bucketIndex < pathParts.length - 1) {
            const oldPath = pathParts.slice(bucketIndex + 1).join('/')
        await supabase.storage.from('avatars').remove([oldPath])
          }
        } catch (deleteError) {
          console.warn('Could not delete old avatar:', deleteError)
          // Continue with upload even if delete fails
        }
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `avatar-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Don't upsert to avoid conflicts
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(uploadError.message || 'Failed to upload file')
      }

      if (!uploadData?.path) {
        throw new Error('Upload succeeded but no path returned')
      }

      // Get public URL using the returned path
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path)

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded image')
      }

      setAvatarUrl(publicUrl)
      toast.success('Image uploaded successfully', { id: uploadToastId })
      
      // Reset the file input
      event.target.value = ''
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error(error.message || 'Failed to upload image', { id: uploadToastId })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) {
      toast.error('Display name is required')
      return
    }

    if (username && username.length < 3) {
      toast.error('Username must be at least 3 characters')
      return
    }

    if (usernameAvailable === false) {
      toast.error('Please choose a different username')
      return
    }

    setLoading(true)
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: username ? username.toLowerCase() : null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl || null,
          privacy_mode: privacyMode,
          status: showOnlineStatus ? 'online' : 'offline',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update discovery settings - first try update, then insert if needed
      const { data: existingDiscovery } = await supabase
        .from('discovery_settings')
        .select('id')
        .eq('user_id', user.id)
        .single()

      let discoveryError
      if (existingDiscovery) {
        // Update existing
        const { error } = await supabase
          .from('discovery_settings')
          .update({
            discoverable: discoverable,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
        discoveryError = error
      } else {
        // Insert new
        const { error } = await supabase
          .from('discovery_settings')
          .insert({
            user_id: user.id,
            discoverable: discoverable,
            location_sharing: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        discoveryError = error
      }

      if (discoveryError) {
        console.error('Discovery settings error:', discoveryError)
        // Don't throw - just log and continue
      }

      await refreshProfile()
      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  if (!user || !profile) {
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
          <SettingsIcon className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Profile Information</span>
                  </CardTitle>
                  <CardDescription>
                    Update your profile information and how others see you on OffGrid
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback>
                        <User className="w-10 h-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <Button
                          variant="outline"
                          disabled={uploadingImage}
                          className="relative"
                          asChild
                        >
                          <span>
                            {uploadingImage ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Camera className="w-4 h-4 mr-2" />
                                Change Photo
                              </>
                            )}
                          </span>
                        </Button>
                      </Label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        JPG, PNG or GIF. Max size 5MB.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="How should people see your name?"
                      required
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                        placeholder="Choose a unique username"
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
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell people a bit about yourself..."
                      maxLength={200}
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-500 text-right">{bio.length}/200</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Privacy & Discovery</span>
                  </CardTitle>
                  <CardDescription>
                    Control who can find you and how your information is shared
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Discoverable */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Make me discoverable</Label>
                      <p className="text-sm text-gray-500">
                        Allow other users to find you in the Discover tab
                      </p>
                    </div>
                    <Switch
                      checked={discoverable}
                      onCheckedChange={setDiscoverable}
                    />
                  </div>

                  <Separator />

                  {/* Online Status */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Show online status</Label>
                      <p className="text-sm text-gray-500">
                        Let friends see when you&apos;re online or offline
                      </p>
                    </div>
                    <Switch
                      checked={showOnlineStatus}
                      onCheckedChange={setShowOnlineStatus}
                    />
                  </div>

                  <Separator />

                  {/* Privacy Mode */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Privacy mode</Label>
                      <p className="text-sm text-gray-500">
                        Enhanced privacy with minimal data retention
                      </p>
                    </div>
                    <Switch
                      checked={privacyMode}
                      onCheckedChange={setPrivacyMode}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="w-5 h-5" />
                    <span>Notifications</span>
                  </CardTitle>
                  <CardDescription>
                    Manage how you receive notifications from OffGrid
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Notification settings will be available in a future update.</p>
                    <p className="text-sm mt-2">For now, all important notifications are enabled by default.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
            <Button
              onClick={handleSaveProfile}
              disabled={loading || checkingUsername || (usernameAvailable === false)}
              className="bg-red-500 hover:bg-red-600 px-8"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
