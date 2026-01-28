"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Location {
  name: string;
  coords: { x: string; y: string };
}

const locations: Location[] = [
  { name: "Anderson Hall", coords: { x: "40%", y: "120%" } },
  { name: "Quadrangle", coords: { x: "40%", y: "130%" } },
  { name: "Miller Library", coords: { x: "60%", y: "100%" } },
  { name: "Main Canteen", coords: { x: "42%", y: "113%" } },
  { name: "Bishop Heber Hall", coords: { x: "14%", y: "68%" } },
  { name: "Selaiyur Hall", coords: { x: "5%", y: "98%" } },
  { name: "St. Thomas's Hall", coords: { x: "65%", y: "100%" } },
  { name: "Barnes Hall", coords: { x: "81%", y: "57%" } },
  { name: "Martin Hall", coords: { x: "81%", y: "57%" } },
  { name: "Margaret Hall", coords: { x: "81%", y: "57%" } },
  { name: "Zoology Dept", coords: { x: "30%", y: "80%" } },
  { name: "Botany Dept", coords: { x: "58%", y: "65%" } },
  { name: "Physics Dept", coords: { x: "43%", y: "123%" } },
  { name: "Chemistry Dept", coords: { x: "45%", y: "125%" } },
  { name: "Main Gate", coords: { x: "40%", y: "120%" } },
  { name: "East Gate", coords: { x: "20%", y: "58%" } },
  { name: "Farm Area", coords: { x: "10%", y: "9%" } }
];

export default function MccCampusMap() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  return (
    <Card className="w-full overflow-hidden border-2 border-brand-primary/10 shadow-lg">
      <CardHeader className="bg-gradient-to-b from-gray-50 to-white border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 mcc-text-primary" />
          </div>
          <div>
            <CardTitle className="mcc-text-primary font-serif text-xl">Interactive Campus Map</CardTitle>
            <CardDescription className="text-brand-text-dark">Select a location to zoom in. Click again to zoom out.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid md:grid-cols-5 gap-6 p-4">
        {/* Map Area */}
        <div className="md:col-span-4 relative w-full h-96 rounded-xl overflow-hidden group shadow-inner bg-gray-100">
          <Image
            src="/mcc map.jpeg"
            alt="MCC Campus Map"
            layout="fill"
            objectFit="contain"
            className="transition-transform duration-700 ease-in-out"
            style={{
              transformOrigin: selectedLocation ? `${selectedLocation.coords.x} ${selectedLocation.coords.y}` : 'center center',
              transform: selectedLocation ? 'scale(2.5)' : 'scale(1)',
            }}
          />
          <div className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-700",
            selectedLocation ? "opacity-100" : "opacity-0"
          )} />
        </div>

        {/* Location List */}
        <div className="md:col-span-1 flex flex-col">
          <h3 className="font-semibold mb-3 text-gray-800 px-1">Campus Hotspots</h3>
          <ScrollArea className="h-96 rounded-lg">
            <div className="space-y-2 pr-3">
              {locations.map((location) => (
                <button
                  key={location.name}
                  onClick={() => setSelectedLocation(selectedLocation?.name === location.name ? null : location)}
                  className={cn(
                    "w-full text-left flex items-center gap-3 p-3 rounded-lg transition-all duration-200 border-2 border-transparent",
                    "hover:bg-blue-50 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400",
                    selectedLocation?.name === location.name
                      ? "bg-blue-100 border-blue-300 shadow-sm text-blue-800 font-semibold"
                      : "text-gray-700"
                  )}
                >
                  <MapPin className={cn("w-5 h-5 flex-shrink-0", selectedLocation?.name === location.name ? "text-blue-600" : "text-gray-400")} />
                  <span className="flex-1">{location.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}