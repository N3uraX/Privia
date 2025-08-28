'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Mail, CheckCircle } from 'lucide-react'

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const resendVerification = async () => {
    setLoading(true)
    try {
      // This would need the user's email - in a real app, you'd store this in state or localStorage
      toast.info('Please sign in again to resend verification email')
      router.push('/login')
    } catch (error) {
      toast.error('Failed to resend verification email')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Listen for auth state changes to detect email verification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        toast.success('Email verified successfully!')
        router.push('/setup-profile')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Check your email</CardTitle>
          <CardDescription className="text-center">
            We&apos;ve sent you a verification link to complete your registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <p className="text-sm text-gray-600">
              Click the link in your email to verify your account and start using OffGrid
            </p>
          </div>
          <div className="space-y-2">
            <Button 
              onClick={resendVerification} 
              variant="outline" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Resend verification email'}
            </Button>
            <Button 
              onClick={() => router.push('/login')} 
              variant="ghost" 
              className="w-full"
            >
              Back to sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
