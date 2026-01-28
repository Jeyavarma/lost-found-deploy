"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  GraduationCap, 
  User, 
  Plus, 
  BookOpen, 
  MessageCircle, 
  LogOut,
  Settings,
  UserCircle,
  Menu,
  X
} from "lucide-react"
import { isAuthenticated, getUserData, logout, type User as AuthUser } from "@/lib/auth"
import NotificationBell from "@/components/notification-bell"

export default function Navigation() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setAuthenticated(isAuthenticated())
    setUser(getUserData())
  }, [])

  const handleLogout = () => {
    logout()
    setAuthenticated(false)
    setUser(null)
    setMobileMenuOpen(false)
  }

  return (
    <nav className="mcc-primary border-b-4 border-brand-accent sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 xs:h-16 sm:h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 group">
              <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 mcc-accent rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg">
                <GraduationCap className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-brand-text-light" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-brand-text-light font-serif leading-tight">MCC Lost & Found</span>
                <span className="text-xs text-gray-300 font-medium hidden xs:block">Madras Christian College</span>
              </div>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            <Link href="/browse">
              <Button variant="ghost" className="hover:bg-red-800 text-brand-text-light font-medium">
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Items
              </Button>
            </Link>
            
            <Link href="/report-lost">
              <Button variant="ghost" className="hover:bg-red-800 text-brand-text-light font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Report Lost
              </Button>
            </Link>
            
            <Link href="/report-found">
              <Button variant="ghost" className="hover:bg-red-800 text-brand-text-light font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Report Found
              </Button>
            </Link>
            
            <Link href="/feedback">
              <Button variant="ghost" className="hover:bg-red-800 text-brand-text-light font-medium">
                <MessageCircle className="w-4 h-4 mr-2" />
                Feedback
              </Button>
            </Link>
            
            {authenticated && <NotificationBell />}
            
            {authenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hover:bg-red-800 text-brand-text-light font-medium">
                    <UserCircle className="w-4 h-4 mr-2" />
                    {user?.name || 'User'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="ghost" className="hover:bg-red-800 text-brand-text-light font-medium">
                  <User className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-brand-text-light hover:bg-red-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-red-700 bg-red-900">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/browse" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-brand-text-light hover:bg-red-800">
                  <BookOpen className="w-4 h-4 mr-3" />
                  Browse Items
                </Button>
              </Link>
              
              <Link href="/report-lost" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-brand-text-light hover:bg-red-800">
                  <Plus className="w-4 h-4 mr-3" />
                  Report Lost
                </Button>
              </Link>
              
              <Link href="/report-found" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-brand-text-light hover:bg-red-800">
                  <Plus className="w-4 h-4 mr-3" />
                  Report Found
                </Button>
              </Link>
              
              <Link href="/feedback" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-brand-text-light hover:bg-red-800">
                  <MessageCircle className="w-4 h-4 mr-3" />
                  Feedback
                </Button>
              </Link>
              
              {authenticated ? (
                <div className="border-t border-red-700 pt-2 mt-2">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-brand-text-light">{user?.name}</p>
                    <p className="text-xs text-gray-300">{user?.email}</p>
                  </div>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-brand-text-light hover:bg-red-800">
                      <Settings className="w-4 h-4 mr-3" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-300 hover:bg-red-800"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-brand-text-light hover:bg-red-800">
                    <User className="w-4 h-4 mr-3" />
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}