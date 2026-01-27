import React, { memo } from 'react'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Calendar, Heart, MessageCircle } from 'lucide-react'
import OptimizedImage from './optimized-image'

interface ItemCardProps {
  item: any
  isLiked: boolean
  onLike: (id: string) => void
  onContact: (item: any) => void
}

const ItemCard = memo(({ item, isLiked, onLike, onContact }: ItemCardProps) => {
  return (
    <Card className="mcc-card hover:shadow-xl transition-all duration-300 group cursor-pointer overflow-hidden border-2 border-gray-200 flex flex-col">
      <div className="relative">
        <OptimizedImage
          src={item.itemImageUrl || item.imageUrl || "/placeholder.svg"}
          alt={item.title}
          className="w-full h-40 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2">
          <Badge
            variant={item.status === "lost" ? "destructive" : "default"}
            className={`shadow-md ${item.status === "lost" ? "bg-red-500" : "bg-green-500"} text-white`}
          >
            {item.status === "lost" ? "Lost" : "Found"}
          </Badge>
        </div>
      </div>

      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs border-brand-primary/30 mcc-text-primary">
            {item.category}
          </Badge>
          <span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</span>
        </div>

        <CardTitle className="text-base sm:text-lg mb-2 group-hover:text-brand-primary transition-colors font-serif min-h-[1.75rem] line-clamp-1">
          {item.title}
        </CardTitle>
        <CardDescription className="mb-3 line-clamp-2 text-brand-text-dark min-h-[2.5rem]">
          {item.description}
        </CardDescription>

        <div className="space-y-1 text-xs sm:text-sm text-brand-text-dark mb-3 sm:mb-4 min-h-[2.5rem]">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 mcc-text-primary" />
            <span className="truncate">{item.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 mcc-text-accent" />
            {new Date(item.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLike(item._id)}
            className={`flex items-center gap-1 ${isLiked ? "text-red-500" : "text-gray-500"}`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            {isLiked ? 1 : 0}
          </Button>
          <Button 
            size="sm" 
            className="mcc-accent hover:bg-red-700 text-white"
            onClick={() => onContact(item)}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

ItemCard.displayName = 'ItemCard'

export default ItemCard