"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Calendar, User, Package, Phone, Mail, MessageCircle, ArrowLeft } from "lucide-react"
import UserStatus from "@/components/user-status"
import Navigation from "@/components/layout/navigation"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { getAuthToken } from "@/lib/auth"

interface Item {
    _id: string
    title: string
    description: string
    category: string
    status: 'lost' | 'found' | 'claimed' | 'verified'
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
    matchScore?: number
}

export default function SingleItemPage() {
    const params = useParams()
    const router = useRouter()
    const { id } = params
    const [item, setItem] = useState<Item | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchItem = async () => {
            try {
                const data = await api.get(`/api/items/${id}`)
                setItem(data)
            } catch (error) {
                console.error("Error fetching item:", error)
                toast.error("Failed to load item details. It may have been deleted.")
            } finally {
                setLoading(false)
            }
        }

        if (id) {
            fetchItem()
        }
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="max-w-4xl mx-auto px-4 py-12 flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                </div>
            </div>
        )
    }

    if (!item) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Item Not Found</h2>
                    <p className="text-gray-600 mb-6">The item you are looking for does not exist or has been removed.</p>
                    <Button onClick={() => router.push('/browse')}>Return to Browse</Button>
                </div>
            </div>
        )
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'lost': return 'bg-red-500 hover:bg-red-600 text-white'
            case 'found': return 'bg-green-500 hover:bg-green-600 text-white'
            case 'claimed': return 'bg-orange-500 hover:bg-orange-600 text-white'
            case 'verified': return 'bg-blue-500 hover:bg-blue-600 text-white'
            default: return 'bg-gray-500 hover:bg-gray-600 text-white'
        }
    }

    // Fallback to parsing contactInfo if reportedBy is null
    let reporterName = item.reportedBy?.name || 'Anonymous'
    let reporterEmail = item.reportedBy?.email || ''
    let reporterPhone = item.reportedBy?.phone || ''

    if (!reporterEmail && item.contactInfo) {
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
        <div className="min-h-screen bg-gray-50">
            <Navigation />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-6 -ml-4 text-gray-600 hover:bg-transparent hover:text-gray-900"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <Card className="mcc-card overflow-hidden shadow-xl border-t-4 border-t-brand-primary">
                    <CardHeader className="bg-white pb-0 pt-8 px-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                            <div>
                                <CardTitle className="text-3xl font-bold font-serif mcc-text-primary mb-3">
                                    {item.title}
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={`text-sm py-1 px-3 ${getStatusColor(item.status)}`}>
                                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                    </Badge>
                                    <Badge variant="secondary" className="text-sm py-1 px-3">{item.category}</Badge>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-8">
                        <div className="space-y-8">
                            {/* Item Image */}
                            {(item.itemImageUrl || item.imageUrl) && (
                                <div className="w-full flex justify-center bg-gray-100 rounded-xl p-4">
                                    <img
                                        src={item.itemImageUrl || item.imageUrl}
                                        alt={item.title}
                                        className="max-h-96 w-auto object-contain rounded-lg shadow-sm"
                                    />
                                </div>
                            )}

                            {/* Quick Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                                <div className="flex items-start gap-4">
                                    <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                            {item.status === 'lost' ? 'Lost Location' : 'Found Location'}
                                        </h4>
                                        <p className="font-medium text-gray-900">{item.location}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                            {item.status === 'lost' ? 'Date Lost' : 'Date Found'}
                                        </h4>
                                        <p className="font-medium text-gray-900">
                                            {new Date(item.date || item.createdAt).toLocaleDateString(undefined, {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <h4 className="text-xl font-semibold mb-4 font-serif text-gray-800 border-b pb-2">Description</h4>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                            </div>

                            {/* Contact Information */}
                            <div className="pt-4 border-t">
                                <h4 className="text-xl font-semibold mb-6 font-serif text-gray-800">Contact Information</h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-6 rounded-xl border">
                                        <div className="flex items-center gap-3 mb-4">
                                            <User className="w-5 h-5 text-gray-500" />
                                            <span className="font-semibold text-lg">{reporterName}</span>
                                            {item.reportedBy?._id && <UserStatus userId={item.reportedBy._id} size="sm" />}
                                        </div>

                                        {reporterEmail && (
                                            <div className="flex flex-col gap-3 mt-4">
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    className="w-full justify-start border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                >
                                                    <a href={`mailto:${reporterEmail}?subject=Regarding ${item.title}`}>
                                                        <Mail className="w-4 h-4 mr-3" />
                                                        Email {reporterName}
                                                    </a>
                                                </Button>
                                            </div>
                                        )}

                                        {reporterPhone && (
                                            <div className="flex items-center gap-3 mt-4 text-gray-600 ml-2">
                                                <Phone className="w-4 h-4" />
                                                <span>{reporterPhone}</span>
                                            </div>
                                        )}
                                    </div>

                                    {item.reportedBy && (
                                        <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex flex-col justify-center items-center text-center">
                                            <MessageCircle className="w-10 h-10 text-green-600 mb-3" />
                                            <h5 className="font-semibold text-green-800 mb-2">In-App Chat</h5>
                                            <p className="text-sm text-green-700 mb-4 px-4">Contact the reporter directly through our secure messaging system.</p>

                                            <Button
                                                onClick={async () => {
                                                    try {
                                                        const token = getAuthToken();
                                                        if (!token) {
                                                            toast.error('Please login to start chat');
                                                            router.push(`/login?returnUrl=/items/${id}`);
                                                            return;
                                                        }

                                                        const response = await fetch(`/api/chat/room/${item._id}`, {
                                                            method: 'POST',
                                                            headers: {
                                                                'Authorization': `Bearer ${token}`,
                                                                'Content-Type': 'application/json'
                                                            }
                                                        });

                                                        if (response.ok) {
                                                            const room = await response.json();
                                                            window.dispatchEvent(new CustomEvent('openChat', { detail: { roomId: room._id, room } }));
                                                            toast.success('Chat started!');
                                                        } else {
                                                            toast.error('Failed to start chat. Please try again.');
                                                        }
                                                    } catch (error) {
                                                        toast.error('Failed to start chat due to a network error.');
                                                    }
                                                }}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                Start Conversation
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
