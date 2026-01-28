"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertCircle, User, Phone, Mail } from 'lucide-react'
import { api } from '@/lib/api'
import { LoadingSpinner } from '@/components/loading-states'

interface ClaimModalProps {
  item: any
  isOpen: boolean
  onClose: () => void
  onClaimSubmitted: () => void
}

export function ClaimModal({ item, isOpen, onClose, onClaimSubmitted }: ClaimModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    contactPhone: '',
    additionalInfo: '',
    meetingPreference: 'campus'
  })

  if (!isOpen || !item) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/api/items/claim', {
        itemId: item._id,
        ...formData
      })

      alert('Claim submitted successfully! The item owner will be notified.')
      onClaimSubmitted()
      onClose()
    } catch (error: any) {
      alert(error.message || 'Failed to submit claim')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Claim Item: {item.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="description">Describe why this item is yours</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provide details that prove ownership (color, brand, unique features, etc.)"
                required
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="Your phone number for coordination"
                required
              />
            </div>

            <div>
              <Label htmlFor="additionalInfo">Additional Information</Label>
              <Textarea
                id="additionalInfo"
                value={formData.additionalInfo}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                placeholder="Any additional details or preferred meeting time"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="meetingPreference">Meeting Preference</Label>
              <select
                id="meetingPreference"
                value={formData.meetingPreference}
                onChange={(e) => setFormData(prev => ({ ...prev, meetingPreference: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="campus">On Campus</option>
                <option value="security">Security Office</option>
                <option value="hostel">Hostel</option>
                <option value="other">Other (specify in additional info)</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : 'Submit Claim'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

interface ClaimStatusProps {
  claim: any
  onStatusUpdate: (claimId: string, status: string) => void
}

export function ClaimStatus({ claim, onStatusUpdate }: ClaimStatusProps) {
  const [loading, setLoading] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected': return <AlertCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true)
    try {
      await api.put(`/api/items/claims/${claim._id}`, { status: newStatus })
      onStatusUpdate(claim._id, newStatus)
    } catch (error: any) {
      alert(error.message || 'Failed to update claim status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(claim.status)}
              <Badge className={getStatusColor(claim.status)}>
                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
              </Badge>
              <span className="text-sm text-gray-500">
                {new Date(claim.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span>{claim.claimedBy?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{claim.claimedBy?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{claim.contactPhone}</span>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-sm font-medium">Claim Description:</p>
              <p className="text-sm text-gray-600">{claim.description}</p>
            </div>

            {claim.additionalInfo && (
              <div className="mt-2">
                <p className="text-sm font-medium">Additional Info:</p>
                <p className="text-sm text-gray-600">{claim.additionalInfo}</p>
              </div>
            )}
          </div>

          {claim.status === 'pending' && (
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('approved')}
                disabled={loading}
                className="text-green-600 hover:bg-green-50"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('rejected')}
                disabled={loading}
                className="text-red-600 hover:bg-red-50"
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}