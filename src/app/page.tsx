import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Shield, Lock, Eye, Clock, MessageSquare, Users } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">OffGrid</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-red-500 hover:bg-red-600">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Privacy-First
            <span className="text-red-500 block">Social Chat</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect with friends without compromising your privacy. OffGrid puts you in control 
            of your data with ephemeral messages, disappearing content, and zero tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-red-500 hover:bg-red-600 px-8">
                Start Chatting Privately
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ephemeral Messages</h3>
            <p className="text-gray-600">
              Images and sensitive content automatically disappear after 15 minutes, 
              ensuring your private moments stay private.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tracking</h3>
            <p className="text-gray-600">
              We don&apos;t track your behavior, sell your data, or show you ads. 
              Your conversations are yours alone.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure by Design</h3>
            <p className="text-gray-600">
              Built with privacy-first architecture, end-to-end encryption, 
              and minimal data collection principles.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Rich Messaging</h3>
            <p className="text-gray-600">
              Share photos, files, and reactions with friends while maintaining 
              full control over your content.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-yellow-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Friend-Focused</h3>
            <p className="text-gray-600">
              Discover and connect with real friends, not influencers or brands. 
              Build genuine relationships in a distraction-free environment.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Privacy Controls</h3>
            <p className="text-gray-600">
              Granular privacy settings, ghost mode, and incognito conversations 
              give you complete control over your digital presence.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-white rounded-2xl p-8 md:p-12 text-center shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to take back control of your conversations?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join OffGrid today and experience social messaging the way it should be - 
            private, secure, and focused on real connections.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-red-500 hover:bg-red-600 px-8">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">OffGrid</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 OffGrid. Privacy-first social messaging.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}