'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, Smile } from 'lucide-react'

interface Reaction {
  userId: string
  emoji: string
  createdAt: string
}

interface MessageReactionsProps {
  messageId: string
  reactions: Reaction[]
  currentUserId: string
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string) => void
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥']

export default function MessageReactions({ 
  messageId, 
  reactions, 
  currentUserId, 
  onAddReaction, 
  onRemoveReaction 
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false)

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = []
    }
    acc[reaction.emoji].push(reaction)
    return acc
  }, {} as Record<string, Reaction[]>)

  const userReaction = reactions.find(r => r.userId === currentUserId)

  const handleEmojiClick = (emoji: string) => {
    if (userReaction) {
      if (userReaction.emoji === emoji) {
        onRemoveReaction(messageId)
      } else {
        onAddReaction(messageId, emoji)
      }
    } else {
      onAddReaction(messageId, emoji)
    }
    setShowPicker(false)
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => (
        <Button
          key={emoji}
          variant="outline"
          size="sm"
          className={`h-6 px-2 text-xs ${
            reactionList.some(r => r.userId === currentUserId)
              ? 'bg-blue-100 border-blue-300'
              : 'bg-gray-50'
          }`}
          onClick={() => handleEmojiClick(emoji)}
        >
          <span className="mr-1">{emoji}</span>
          <span>{reactionList.length}</span>
        </Button>
      ))}

      {/* Add reaction button */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-4 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}