"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  GraduationCap,
  Zap,
} from "lucide-react"
import Navigation from "@/components/layout/navigation"





export default function HomePage() {
  const searchQuery = ""

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* MCC Brand Hero Section */}
      <div className="mcc-primary text-brand-text-light relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        {/* Brand accent stripe */}
        <div className="absolute top-0 left-0 w-full h-1 mcc-accent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24 relative">
          <div className="text-center">

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 animate-fade-in font-serif">Lost Something? Found Something?</h1>
            <p className="text-lg sm:text-xl mb-2 opacity-95 font-medium">Madras Christian College Community Portal</p>
            <p className="text-base sm:text-lg mb-6 sm:mb-8 opacity-80">
              Connect with your campus community to reunite with lost belongings
            </p>

            {/* Enhanced Search Bar with Filters */}
            <div className="max-w-4xl mx-auto relative">
              <div className="bg-white rounded-xl p-2 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
                  <div className="flex items-center flex-1">
                    <Search className="ml-3 sm:ml-4 mcc-text-primary w-5 h-5 sm:w-6 sm:h-6" />
                    <Input
                      type="text"
                      placeholder="Search for textbooks, electronics, ID cards..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 border-0 bg-transparent text-sm sm:text-lg text-brand-text-dark placeholder:text-gray-500 focus:ring-0 px-3 sm:px-4 py-3 sm:py-4"
                    />
                  </div>
                  <div className="flex items-center gap-2 mr-2">
                    <Button 
                      size="default" 
                      className="mcc-accent hover:bg-red-700 text-white shadow-lg w-full sm:w-auto"
                      onClick={() => window.location.href = `/browse?search=${encodeURIComponent(searchQuery)}`}
                    >
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Search Tags */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6 sm:mt-8">
              {["Electronics", "Textbooks", "ID Cards", "Keys", "Calculators"].map((tag) => (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  className="bg-white/20 border-white/40 text-brand-text-light hover:bg-white/30 rounded-full font-medium backdrop-blur-sm text-xs sm:text-sm"
                  onClick={() => window.location.href = `/browse?category=${encodeURIComponent(tag)}`}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Introduction Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="bg-gradient-to-br from-red-50 via-white to-red-50 rounded-3xl p-8 md:p-12 shadow-xl border border-red-100">
            <h2 className="text-3xl md:text-4xl font-bold mcc-text-primary mb-6 font-serif">
              Lost Something? We've Got You Covered.
            </h2>
            <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
              Every day, MCC students lose valuable items across campus. From textbooks to electronics, 
              we're here to reunite you with what matters most through our digital lost & found community.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-2xl font-bold text-green-600 mb-2">Instant Reports</div>
                <p className="text-gray-600">Upload photos and details in seconds. Your report goes live immediately.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-2xl font-bold text-blue-600 mb-2">Smart Search</div>
                <p className="text-gray-600">Find items by description, location, or category with intelligent matching.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-2xl font-bold text-red-600 mb-2">Direct Contact</div>
                <p className="text-gray-600">Connect instantly with finders or owners through secure messaging.</p>
              </div>
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/report-lost">
                <Button size="lg" className="mcc-accent hover:bg-red-700 text-white px-8 py-3 font-semibold shadow-lg">
                  Report Lost Item
                </Button>
              </Link>
              <Link href="/browse">
                <Button size="lg" variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 px-8 py-3 font-semibold">
                  Browse Found Items
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* MCC Campus Map */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mcc-text-primary font-serif">Campus Map & Navigation</h2>
              <p className="text-brand-text-dark">Interactive map of MCC buildings and locations</p>
            </div>
          </div>
          <MccCampusMap />
        </div>

        {/* Event Highlights */}
        <EventHighlights />

        {/* Live Activity Feed */}
        <div className="mb-12">
          <LiveActivity />
        </div>



        {/* Browse Items */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold mb-3 mcc-text-primary font-serif">Browse Items</h2>
            <p className="text-brand-text-dark text-lg">Help your fellow MCC students find their belongings</p>
          </div>
          <Link href="/browse">
            <Button size="lg" className="mcc-accent hover:bg-red-700 text-white px-8 py-3">
              View All Items
            </Button>
          </Link>
        </div>

        {loadingItems ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-52 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredItems.slice(0, 4).map((item) => (
              <Card
                key={item._id}
                className="mcc-card hover:shadow-2xl transition-all duration-500 group cursor-pointer overflow-hidden border-2 border-gray-200"
              >
                <div className="relative">
                  <ImageWithFallback
                    src={item.itemImageUrl || item.imageUrl}
                    alt={item.title}
                    className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                    fallbackText="No Image"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Badge
                      variant={item.status === "lost" ? "destructive" : "default"}
                      className={`shadow-lg font-medium ${
                        item.status === "lost" ? "bg-red-500" : "bg-green-500"
                      } text-white`}
                    >
                      {item.status === "lost" ? "Lost" : "Found"}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-xs font-medium border-brand-primary/30 mcc-text-primary">
                      {item.category}
                    </Badge>
                    <span className="text-xs text-gray-500 font-medium">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <CardTitle className="text-lg mb-3 group-hover:text-brand-primary transition-colors cursor-pointer font-serif">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="mb-4 line-clamp-2 text-brand-text-dark">
                    {item.description}
                  </CardDescription>

                  <div className="space-y-2 text-sm text-brand-text-dark mb-5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 mcc-text-primary" />
                      <span className="truncate font-medium">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium">{item.reportedBy?.name || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-yellow-600" />
                      <span className="truncate font-medium">{item.reportedBy?.email || item.contactEmail}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(item._id)}
                        className={`flex items-center gap-1 hover:bg-red-50 ${
                          likedItems.has(item._id) ? "text-red-500" : "text-gray-500"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${likedItems.has(item._id) ? "fill-current" : ""}`} />
                        <span className="font-medium">{likedItems.has(item._id) ? 1 : 0}</span>
                      </Button>
                    </div>
                    <Button 
                      size="sm" 
                      className="mcc-accent hover:bg-red-700 text-white shadow-md font-medium"
                      onClick={() => setSelectedItem(item)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}


      </div>
      
      {/* Footer */}
      <footer className="mcc-primary text-brand-text-light mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 mcc-accent rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-brand-text-light" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-serif">MCC Lost & Found</h3>
                  <p className="text-sm text-gray-300">Madras Christian College</p>
                </div>
              </div>
              <p className="text-gray-300 mb-4 max-w-md">
                Connecting the MCC community to reunite students with their lost belongings. 
                A digital platform built for Madras Christian College students, by students.
              </p>
              <div className="flex space-x-4">
                <div className="text-sm">
                  <span className="font-semibold">📧 Contact:</span>
                  <br />
                  <span className="text-gray-300">lostfound@mcc.edu.in</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link href="/report-lost" className="hover:text-white transition-colors">Report Lost Item</Link></li>
                <li><Link href="/report-found" className="hover:text-white transition-colors">Report Found Item</Link></li>
                <li><Link href="/browse" className="hover:text-white transition-colors">Browse Items</Link></li>
                <li><Link href="/feedback" className="hover:text-white transition-colors">Feedback</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Campus Info</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="https://maps.google.com/?q=Madras+Christian+College,+East+Tambaram,+Chennai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors cursor-pointer">📍 East Tambaram, Chennai</a></li>
                <li>📞 044-2271 5566</li>
                <li><a href="https://www.mcc.edu.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors cursor-pointer">🌐 www.mcc.edu.in</a></li>
                <li>🕒 24/7 Lost & Found Service</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-600 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-300">
              © 2024 MCC Lost & Found. Made with ❤️ for Madras Christian College community.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0 text-sm text-gray-300">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Help</span>
            </div>
          </div>
        </div>
      </footer>
      
      <ItemDetailModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onStartChat={handleStartChat}
      />
      
      <EnhancedFloatingChat />
    </div>
  )
}
