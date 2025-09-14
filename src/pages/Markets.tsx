import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star, Heart, MapPin, Clock } from "lucide-react";
import { MarketDetailsModal } from "@/components/MarketDetailsModal";

interface Market {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string;
  vendors: any[];
  rating: number;
  reviewCount: number;
}

const Markets = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data for markets
  const markets: Market[] = [
    {
      id: "1",
      name: "Downtown Farmers Market",
      address: "123 Main St",
      city: "Portland",
      state: "OR",
      days: ["Sat", "Sun"],
      hours: "8:00 AM - 2:00 PM",
      vendors: Array(12).fill(null),
      rating: 4.5,
      reviewCount: 128
    },
    {
      id: "2",
      name: "Riverside Community Market",
      address: "456 River Rd",
      city: "Portland",
      state: "OR",
      days: ["Wed", "Sat"],
      hours: "9:00 AM - 1:00 PM",
      vendors: Array(8).fill(null),
      rating: 4.2,
      reviewCount: 89
    },
    {
      id: "3",
      name: "Pearl District Market",
      address: "789 Pearl Ave",
      city: "Portland",
      state: "OR",
      days: ["Thu", "Sun"],
      hours: "10:00 AM - 3:00 PM",
      vendors: Array(15).fill(null),
      rating: 4.7,
      reviewCount: 203
    },
    {
      id: "4",
      name: "Westside Organic Market",
      address: "321 West Blvd",
      city: "Beaverton",
      state: "OR",
      days: ["Fri", "Sat"],
      hours: "8:30 AM - 2:30 PM",
      vendors: Array(6).fill(null),
      rating: 4.1,
      reviewCount: 67
    }
  ];

  const filteredMarkets = markets.filter(market =>
    market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateDistance = (address: string) => {
    // Mock distance calculation
    return `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 9)} miles`;
  };

  const handleMarketClick = (market: Market) => {
    setSelectedMarket(market);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Local Farmers Markets</h1>
          <p className="text-lg text-gray-600 mb-6">
            Discover fresh, local produce at farmers markets near you
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search markets by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-3 text-lg"
            />
          </div>
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map((market) => (
            <Card 
              key={market.id} 
              className="group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden relative"
              onClick={() => handleMarketClick(market)}
            >
              {/* Market Image */}
              <div className="relative h-48 bg-gradient-to-br from-green-400 to-green-600">
                <div className="absolute inset-0 bg-black/20"></div>
                
                {/* Rating Badge - Top Left */}
                <div className="absolute top-3 left-3 bg-white/90 px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium text-gray-700">
                    {market.rating} ({market.reviewCount})
                  </span>
                </div>
                
                {/* Heart Icon - Top Right */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white h-8 w-8 rounded-full shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle like functionality
                  }}
                >
                  <Heart className="h-4 w-4 text-gray-600" />
                </Button>
                
                {/* Distance Badge - Bottom Right */}
                <div className="absolute bottom-3 right-3 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                  <span className="text-xs font-medium text-gray-700">
                    {calculateDistance(market.address)}
                  </span>
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-foreground group-hover:text-green-600 transition-colors">
                  {market.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {market.address}, {market.city}, {market.state}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{market.hours}</p>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {market.days.map((day) => (
                    <Badge key={day} variant="secondary" className="text-xs">
                      {day}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">
                    {market.vendors.length} vendor{market.vendors.length !== 1 ? 's' : ''}
                  </span>
                  <Button variant="outline" size="sm" className="text-xs">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMarkets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">No markets found matching your search.</p>
          </div>
        )}
      </div>

      {/* Market Details Modal */}
      {selectedMarket && (
        <MarketDetailsModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          marketName={selectedMarket.name}
          marketAddress={`${selectedMarket.address}, ${selectedMarket.city}, ${selectedMarket.state}`}
          marketDays={selectedMarket.days}
          marketHours={undefined}
        />
      )}
    </div>
  );
};

export default Markets;