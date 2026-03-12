"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Image as ImageIcon, MapPin, Search, User, EyeOff, ShieldCheck, MessageCircle, Mail, Phone, Clock, FileText, CheckCircle, Package, Ghost } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import UserStatus from "@/components/user-status"
import Navigation from "@/components/layout/navigation"
import { ClaimModal, ClaimStatus } from "@/components/features/item-claims"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { getAuthToken, getUserData, User as AuthUser } from "@/lib/auth"

interface Item {
    _id: string
    title: string
    description: string
    category: string
    status: 'lost' | 'found' | 'resolved' | 'claimed' | 'verified'
    location: string
    dateReported: string
    approved?: boolean
    flagged?: boolean
    handoverOTP?: string
    date?: string
    createdAt: string
    isImageHidden?: boolean
    isAnonymous?: boolean
    verificationQuestions?: string[]
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
    returnProcessStatus?: 'none' | 'pending_confirmation' | 'confirmed'
    returnedToId?: string
}

export default function SingleItemPage() {
    const params = useParams()
    const router = useRouter()
    const { id } = params
    const [item, setItem] = useState<Item | null>(null)
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
    const [isMarkingReturned, setIsMarkingReturned] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)
    const [showReturnDialog, setShowReturnDialog] = useState(false)
    const [returnedToEmail, setReturnedToEmail] = useState("")
    const [showClaimDialog, setShowClaimDialog] = useState(false)
    const [claims, setClaims] = useState<any[]>([])
    const [handoverOTP, setHandoverOTP] = useState("")
    const [isVerifyingOTP, setIsVerifyingOTP] = useState(false)

    useEffect(() => {
        const fetchItem = async () => {
            try {
                const data = await api.get(`/api/items/${id}`)
                setItem(data)

                const user = getUserData()
                setCurrentUser(user)

                if (data.status === 'found' && user?.id === data.reportedBy?._id) {
                    try {
                        const claimsData = await api.get(`/api/claims/item/${id}`)
                        setClaims(claimsData)
                    } catch (err) {
                        console.error("Failed to load claims", err)
                    }
                }
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

    const handleMarkAsReturned = async () => {
        setIsMarkingReturned(true)
        try {
            const body = returnedToEmail.trim() ? { returnedToEmail: returnedToEmail.trim() } : {}
            const res = await api.put(`/api/items/${id}/return`, body)

            toast.success(res.message || "Item marked as returned!")
            setItem(res.item) // Backend returns updated item
            setShowReturnDialog(false)
        } catch (error: any) {
            console.error("Error marking as returned:", error)
            toast.error(error.response?.data?.message || "Failed to mark item as returned.")
        } finally {
            setIsMarkingReturned(false)
        }
    }

    const handleConfirmReceipt = async () => {
        setIsConfirming(true)
        try {
            const res = await api.put(`/api/items/${id}/confirm-return`)
            toast.success("Receipt confirmed successfully!")
            setItem(res.item)
        } catch (error: any) {
            console.error("Error confirming receipt:", error)
            toast.error(error.response?.data?.message || "Failed to confirm receipt.")
        } finally {
            setIsConfirming(false)
        }
    }

    const handleVerifyOTP = async () => {
        setIsVerifyingOTP(true)
        try {
            const res = await api.post(`/api/items/${id}/verify-handover`, { otp: handoverOTP })
            toast.success("Handover verified and item successfully returned!")
            setItem(res.item)
            setHandoverOTP("")
        } catch (error: any) {
            console.error("Error verifying OTP:", error)
            toast.error(error.response?.data?.message || "Invalid OTP. Please try again.")
        } finally {
            setIsVerifyingOTP(false)
        }
    }

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
            case 'resolved': return 'bg-gray-600 hover:bg-gray-700 text-white'
            default: return 'bg-gray-500 hover:bg-gray-600 text-white'
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
                                        {item.status === 'resolved' ? 'Returned / Resolved' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                    </Badge>
                                    <Badge variant="secondary" className="text-sm py-1 px-3">{item.category}</Badge>
                                    {item.isAnonymous && <Badge variant="outline" className="text-sm py-1 px-3 bg-purple-50 text-purple-700 border-purple-200"><Ghost className="w-3 h-3 mr-1 inline" />Anonymous</Badge>}
                                </div>
                            </div>

                            {/* Mark as returned button for owner */}
                            {currentUser?.id === item.reportedBy?._id && item.status !== 'resolved' && item.returnProcessStatus !== 'pending_confirmation' && (
                                <Button
                                    onClick={() => setShowReturnDialog(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-md animate-in fade-in transition-all"
                                >
                                    Mark as Returned
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="p-8">
                        <div className="space-y-8">
                            {/* Return Confirmation Banners */}
                            {item.returnProcessStatus === 'pending_confirmation' && currentUser?.id === item.returnedToId && (
                                <div className="bg-orange-50 border border-orange-200 p-5 rounded-xl shadow-sm animate-in fade-in zoom-in-95">
                                    <h4 className="font-semibold text-orange-800 text-lg mb-1 flex items-center gap-2">
                                        <Package className="w-5 h-5" />
                                        Handover OTP
                                    </h4>
                                    <p className="text-orange-700 mb-4">
                                        The finder is ready to hand over your item. Please provide this secure OTP to them when you meet physically.
                                    </p>
                                    <div className="bg-white px-5 py-3 rounded-lg border border-orange-200 inline-block shadow-sm">
                                        <span className="text-2xl font-mono font-bold tracking-[0.3em] text-orange-600">
                                            {item.handoverOTP || '******'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {item.returnProcessStatus === 'pending_confirmation' && currentUser?.id === item.reportedBy?._id && (
                                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl shadow-sm animate-in fade-in">
                                    <h4 className="font-semibold text-yellow-800 text-lg mb-2 flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-yellow-600" />
                                        Verify Handover OTP
                                    </h4>
                                    <p className="text-sm text-yellow-700 mb-4">
                                        Ask the receiver for their Handover OTP. Entering it here acts as a digital signature and securely completes the handback.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                                        <Input
                                            placeholder="Enter 6-digit OTP"
                                            value={handoverOTP}
                                            onChange={(e) => setHandoverOTP(e.target.value)}
                                            className="font-mono text-center tracking-widest bg-white border-yellow-300 focus-visible:ring-yellow-500 h-11"
                                            maxLength={6}
                                        />
                                        <Button
                                            onClick={handleVerifyOTP}
                                            disabled={isVerifyingOTP || handoverOTP.length < 6}
                                            className="bg-yellow-600 hover:bg-yellow-700 text-white shadow-sm h-11 px-6 min-w-[140px]"
                                        >
                                            {isVerifyingOTP ? "Verifying..." : "Verify"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {/* Item Image */}
                            {(item.itemImageUrl || item.imageUrl) && (
                                <div className="w-full flex justify-center bg-gray-100 rounded-xl p-4 relative overflow-hidden group">
                                    <img
                                        src={item.itemImageUrl || item.imageUrl}
                                        alt={item.title}
                                        className={`max-h-[500px] w-auto object-contain rounded-lg shadow-sm transition-all duration-500 ${(item.status === 'found' && item.isImageHidden && currentUser?.id !== item.reportedBy?._id && item.returnProcessStatus !== 'confirmed')
                                            ? 'blur-3xl scale-125 brightness-50 contrast-125'
                                            : ''
                                            }`}
                                    />
                                    {item.status === 'found' && item.isImageHidden && currentUser?.id !== item.reportedBy?._id && item.returnProcessStatus !== 'confirmed' && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 z-10">
                                            <div className="bg-white/95 backdrop-blur-md px-6 py-5 rounded-2xl shadow-2xl text-center max-w-sm transform transition-all group-hover:scale-105">
                                                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <EyeOff className="w-8 h-8 text-orange-600" />
                                                </div>
                                                <h4 className="font-bold text-gray-900 text-lg mb-2">Image Protected</h4>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    The finder has hidden this image to prevent fraudulent claims. You must answer their verification questions to claim ownership.
                                                </p>
                                            </div>
                                        </div>
                                    )}
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

                                        {currentUser?.id !== item.reportedBy?._id && reporterEmail && (
                                            <div className="flex flex-col gap-3 mt-4">
                                                <Button
                                                    onClick={() => {
                                                        const subject = encodeURIComponent(`Regarding your ${item.status === 'lost' ? 'lost' : 'found'} item: ${item.title}`);
                                                        const body = encodeURIComponent(`Hi ${reporterName},\n\nI believe I might have some information regarding the ${item.title} you posted on MCC Lost & Found.\n\nPlease let me know when we can connect.\n\nThanks!`);
                                                        window.location.href = `mailto:${reporterEmail}?subject=${subject}&body=${body}`;
                                                    }}
                                                    variant="outline"
                                                    className="w-full justify-start border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                >
                                                    <Mail className="w-4 h-4 mr-3" />
                                                    Email {reporterName}
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

                                    {item.reportedBy && currentUser?.id !== item.reportedBy._id && (
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

                                                        const room = await api.post(`/api/chat/room/${item._id}`);
                                                        window.dispatchEvent(new CustomEvent('openChat', { detail: { roomId: room._id, room } }));
                                                        toast.success('Chat started!');
                                                    } catch (error) {
                                                        toast.error('Failed to start chat. Please try again.');
                                                    }
                                                }}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                Start Conversation
                                            </Button>
                                        </div>
                                    )}

                                    {item.status === 'found' && currentUser?.id !== item.reportedBy?._id && (
                                        <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 flex flex-col justify-center items-center text-center sm:col-span-2">
                                            <Package className="w-10 h-10 text-orange-600 mb-3" />
                                            <h5 className="font-semibold text-orange-800 mb-2">Is this your item?</h5>
                                            <p className="text-sm text-orange-700 mb-4 px-4">Submit a formal claim to verify ownership and arrange for handback.</p>

                                            <Button
                                                onClick={() => {
                                                    const token = getAuthToken();
                                                    if (!token) {
                                                        toast.error('Please login to claim this item');
                                                        router.push(`/login?returnUrl=/items/${id}`);
                                                        return;
                                                    }
                                                    setShowClaimDialog(true);
                                                }}
                                                className="w-full max-w-sm bg-orange-600 hover:bg-orange-700 text-white shadow-md text-lg h-12"
                                            >
                                                Claim This Item
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Claims Section for Finder */}
                {item.status === 'found' && currentUser?.id === item.reportedBy?._id && claims.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-2xl font-bold font-serif mb-6">Item Claims ({claims.length})</h3>
                        <div className="space-y-4">
                            {claims.map((claim: any) => (
                                <ClaimStatus
                                    key={claim._id}
                                    claim={claim}
                                    onStatusUpdate={(claimId, newStatus) => {
                                        setClaims(claims.map((c) => c._id === claimId ? { ...c, status: newStatus } : c));
                                        if (newStatus === 'approved') {
                                            toast.success("Claim approved! You can now arrange the handback.");
                                            window.location.reload();
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mark Item as Returned</DialogTitle>
                        <DialogDescription>
                            If you are returning this item to a platform user, enter their email address below to ask for their confirmation. If not, leave it blank to close the listing directly.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="returnedToEmail" className="text-right">
                                User Email (Optional)
                            </Label>
                            <Input
                                id="returnedToEmail"
                                type="email"
                                placeholder="user@example.com"
                                value={returnedToEmail}
                                onChange={(e) => setReturnedToEmail(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReturnDialog(false)} disabled={isMarkingReturned}>
                            Cancel
                        </Button>
                        <Button onClick={handleMarkAsReturned} disabled={isMarkingReturned} className="bg-green-600 hover:bg-green-700 text-white">
                            {isMarkingReturned ? "Updating..." : "Mark Returned"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ClaimModal
                item={item}
                isOpen={showClaimDialog}
                onClose={() => setShowClaimDialog(false)}
                onClaimSubmitted={() => {
                    toast.success("Claim submitted successfully!");
                    window.location.reload();
                }}
            />
        </div>
    )
}
