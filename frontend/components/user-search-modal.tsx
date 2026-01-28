"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, User, MessageCircle } from "lucide-react"
import { BACKEND_URL } from "@/lib/config"
import { getAuthToken } from "@/lib/auth"

interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface UserSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUser: (user: User) => void
  currentUserId: string
}

export default function UserSearchModal({ isOpen, onClose, onSelectUser, currentUserId }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && searchQuery.length >= 2) {
      searchUsers()
    } else {
      setUsers([])
    }
  }, [searchQuery, isOpen])

  const searchUsers = async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Filter out current user
        setUsers(data.filter((user: User) => user._id !== currentUserId))
      }
    } catch (error) {
      console.error('Failed to search users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectUser = (user: User) => {
    onSelectUser(user)
    onClose()
    setSearchQuery("")
    setUsers([])
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Start New Chat
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {searchQuery.length < 2 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Type at least 2 characters to search for users
            </p>
          )}
          
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          )}
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {users.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => handleSelectUser(user)}
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
                <Button size="sm" variant="outline">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {searchQuery.length >= 2 && !loading && users.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No users found matching "{searchQuery}"
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}