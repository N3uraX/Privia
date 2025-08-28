'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon,
  Smile,
  Clock
} from 'lucide-react'

interface MessageInputProps {
  conversationId: string
  onMessageSent: () => void
}

export function MessageInput({ conversationId, onMessageSent }: MessageInputProps) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [ephemeralMode, setEphemeralMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  // Handle typing indicators
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!user || !conversationId) return

    try {
      if (isTyping) {
        // Use upsert with onConflict to handle existing records
        const { error } = await supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: user.id,
            is_typing: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'conversation_id,user_id'
          })
        
        if (error) {
          console.error('Error setting typing status:', error)
        }
      } else {
        // Update existing record to set is_typing to false instead of deleting
        const { error } = await supabase
          .from('typing_indicators')
          .update({
            is_typing: false,
            updated_at: new Date().toISOString()
          })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
        
        if (error) {
          console.error('Error clearing typing status:', error)
          // Fallback: try to delete the record if update fails
          try {
            await supabase
              .from('typing_indicators')
              .delete()
              .eq('conversation_id', conversationId)
              .eq('user_id', user.id)
          } catch (deleteError) {
            console.error('Fallback delete also failed:', deleteError)
          }
        }
      }
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  }, [user, conversationId, supabase])

  // Clean up typing indicator on unmount
  useEffect(() => {
    return () => {
      // Ensure typing indicator is cleared when component unmounts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      updateTypingStatus(false)
    }
  }, [updateTypingStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !message.trim() || loading) return

    setLoading(true)
    try {
      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: message.trim(),
        message_type: 'text' as const,
        ephemeral_expires_at: ephemeralMode 
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes from now
          : null
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData)

      if (error) throw error

      setMessage('')
      onMessageSent()
      
      // Clear typing indicator
      updateTypingStatus(false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'

    // Handle typing indicators
    if (e.target.value.trim()) {
      // User is typing
      updateTypingStatus(true)
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set timeout to stop typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false)
      }, 3000)
    } else {
      // User stopped typing (empty input)
      updateTypingStatus(false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!user) return

    setLoading(true)
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `chat-files/${conversationId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath)

      // Determine message type
      const messageType = file.type.startsWith('image/') ? 'image' : 'file'

      // Save message to database
      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: null,
        message_type: messageType,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        ephemeral_expires_at: ephemeralMode && messageType === 'image'
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : null
      }

      const { error: messageError } = await supabase
        .from('messages')
        .insert(messageData)

      if (messageError) throw messageError

      onMessageSent()
      toast.success('File sent successfully')
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      handleFileUpload(file)
    }
    e.target.value = '' // Reset input
  }

  return (
    <div className="bg-white border-t border-gray-200 p-4 min-w-0">
      {/* Ephemeral mode indicator */}
      {ephemeralMode && (
        <div className="mb-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          Ephemeral mode: Images will disappear after 15 minutes
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-2 min-w-0">
        {/* File input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        {/* Attachment button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex-shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        {/* Image button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.accept = 'image/*'
              fileInputRef.current.click()
            }
          }}
          disabled={loading}
          className="flex-shrink-0"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="resize-none min-h-[40px] max-h-[120px] pr-12 min-w-0"
            disabled={loading}
          />
          
          {/* Emoji button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 bottom-2 h-6 w-6 p-0"
            disabled={loading}
          >
            <Smile className="w-4 h-4" />
          </Button>
        </div>

        {/* Ephemeral toggle */}
        <Button
          type="button"
          variant={ephemeralMode ? "default" : "ghost"}
          size="sm"
          onClick={() => setEphemeralMode(!ephemeralMode)}
          className={`flex-shrink-0 ${ephemeralMode ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
          disabled={loading}
        >
          <Clock className="w-4 h-4" />
        </Button>

        {/* Send button */}
        <Button
          type="submit"
          disabled={!message.trim() || loading}
          className="flex-shrink-0 bg-red-500 hover:bg-red-600"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
