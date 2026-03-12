"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { MapPin, Calendar, User, Package, Phone, Mail, MessageCircle, Link2, ExternalLink } from "lucide-react"
import UserStatus from "@/components/user-status"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { getUserData } from "@/lib/auth"

interface Item {
  _id: string
  title: string
  description: string
  category: string
  status: 'lost' | 'found' | 'claimed' | 'verified' | 'resolved'
  location: string
  date?: string
  createdAt: string
  itemImageUrl?: string
  imageUrl?: string
  reportedBy?: {
    _id: string
    name: string
    email: string
    phone?: string
  }
  contactInfo?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  matchScore?: number
}

interface ItemDetailModalProps {
  item: Item | null
  isOpen: boolean
  onClose: () => void
  onStartChat?: (item: Item) => void
}

export default function ItemDetailModal({ item, isOpen, onClose, onStartChat }: ItemDetailModalProps) {
  if (!item) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lost': return 'bg-red-500 text-white'
      case 'found': return 'bg-green-500 text-white'
      case 'claimed': return 'bg-orange-500 text-white'
      case 'verified': return 'bg-blue-500 text-white'
      case 'resolved': return 'bg-gray-600 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Use structured contact details if available, fallback to parsing contactInfo if reportedBy is null
  let reporterName = item.reportedBy?.name || item.contactName || 'Anonymous'
  let reporterEmail = item.reportedBy?.email || item.contactEmail || ''
  let reporterPhone = item.reportedBy?.phone || item.contactPhone || ''

  if (!reporterEmail && item.contactInfo && !item.contactName) {
    const parts = item.contactInfo.split(' - ')
    if (parts.length >= 2) {
      reporterName = parts[0]
      reporterEmail = parts[1]
      if (parts.length > 2) {
        reporterPhone = parts.slice(2).join(' - ')
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Item Details
          </DialogTitle>
          <DialogDescription>
            View item information and contact the reporter
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Image */}
          {(item.itemImageUrl || item.imageUrl) && (
            <div className="flex justify-center">
              <div className="relative w-full h-64">
                <Image
                  src={item.itemImageUrl || item.imageUrl || "/placeholder.svg"}
                  alt={item.title || "Item image"}
                  fill
                  className="object-cover rounded-lg shadow-md"
                />
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={getStatusColor(item.status)}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Badge>
                <Badge variant="outline">{item.category}</Badge>
                {item.matchScore && (
                  <Badge variant="outline" className="text-xs">
                    {item.matchScore >= 60 ? '🔥 High Match' :
                      item.matchScore >= 40 ? '⭐ Good Match' :
                        '💡 Possible Match'} ({item.matchScore}%)
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>{item.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>{new Date(item.date || item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{item.description}</p>
          </div>

          {/* Reporter Info */}
          {(reporterName || reporterEmail) && (
            <div>
              <h4 className="font-semibold mb-2">Reported By</h4>
              <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" aria-hidden="true" />
                  <span className="font-medium">{reporterName}</span>
                  {item.reportedBy?._id && <UserStatus userId={item.reportedBy._id} size="sm" />}
                </div>
                {reporterEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" aria-hidden="true" />
                    <span className="text-sm">{reporterEmail}</span>
                  </div>
                )}
                {reporterPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" aria-hidden="true" />
                    <span className="text-sm">{reporterPhone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Info */}
          {item.contactInfo && (
            <div>
              <h4 className="font-semibold mb-2">Contact Information</h4>
              <p className="text-sm bg-gray-50 p-3 rounded-lg">{item.contactInfo}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>

            <Button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/items/${item._id}`);
                toast.success('Link copied to clipboard!');
              }}
              variant="outline"
              title="Copy Link"
              aria-label="Copy Link"
              className="px-3"
            >
              <Link2 className="w-4 h-4" aria-hidden="true" />
            </Button>

            <Button
              asChild
              variant="outline"
              title="View Full Page"
              aria-label="View Full Page"
              className="px-3"
            >
              <a href={`/items/${item._id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            </Button>

            {(() => {
              const currentUser = getUserData();
              const isOwner = currentUser?.id === item.reportedBy?._id;

              return !isOwner && (
                <>
                  {reporterEmail && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const subject = encodeURIComponent(`Regarding your ${item.status === 'lost' ? 'lost' : 'found'} item: ${item.title}`);
                          const body = encodeURIComponent(`Hi ${reporterName},\n\nI believe I might have some information regarding the ${item.title} you posted on MCC Lost & Found.\n\nPlease let me know when we can connect.\n\nThanks!`);
                          window.location.href = `mailto:${reporterEmail}?subject=${subject}&body=${body}`;
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                        Email {reporterName}
                      </Button>

                      {item.reportedBy && (
                        <Button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token') || localStorage.getItem('mcc_auth_token');
                              if (!token) {
                                toast.error('Please login to start chat');
                                return;
                              }

                              const room = await api.post(`/api/chat/room/${item._id}`);
                              window.dispatchEvent(new CustomEvent('openChat', { detail: { roomId: room._id, room } }));
                              toast.success('Chat started!');
                              onClose();
                            } catch (error) {
                              console.error('Start chat error:', error);
                              toast.error('Failed to start chat. Please try again.');
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                          Chat about this item
                        </Button>
                      )}
                    </div>
                  )}
                  {!reporterEmail && onStartChat && (
                    <Button
                      onClick={() => onStartChat(item)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                      Contact Options
                    </Button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}