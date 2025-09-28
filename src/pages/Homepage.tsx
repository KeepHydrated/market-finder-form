// Homepage component for displaying vendors and markets with distance calculations - rebuild cache
// Homepage component for displaying vendors and markets with distance calculations
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Heart, Star, Filter, RotateCcw, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLikes } from "@/hooks/useLikes";
import { calculateDistance, getGoogleMapsDistance, getCoordinatesForAddress, cacheVendorCoordinates } from "@/lib/geocoding";

interface AcceptedSubmission {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any[];
  selected_market: string;
  search_term: string;
  market_address?: string;
  market_days?: string[];
  market_hours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>;
  created_at: string;
}

interface VendorRating {
  vendorId: string;
  averageRating: number;
  totalReviews: number;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SPECIALTY_CATEGORIES = [
  "Fresh Flowers & Plants",
  "Bakery", 
  "Dairy",
  "Rancher",
  "Beverages",
  "Seasonings & Spices",
  "Pets",
  "Home Goods",
  "Farmers",
  "Ready to Eat",
  "Packaged Goods & Snacks",
  "Artisan"
];

const Homepage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();
  const [acceptedSubmissions, setAcceptedSubmissions] = useState<AcceptedSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<AcceptedSubmission[]>([]);
  const [vendorRatings, setVendorRatings] = useState<Record<string, VendorRating>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dayTimeSelections, setDayTimeSelections] = useState<Record<string, {
    startTime: string;
    startPeriod: 'AM' | 'PM';
    endTime: string;
    endPeriod: 'AM' | 'PM';
  }>>({});
  const [locationZipcode, setLocationZipcode] = useState<string>('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [rangeMiles, setRangeMiles] = useState<number[]>([25]);
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [viewMode, setViewMode] = useState<'markets' | 'vendors' | 'products'>('vendors');
  const [selectedMarket, setSelectedMarket] = useState<{
    name: string;
    address: string;
    vendors: AcceptedSubmission[];
  } | null>(null);
  const [vendorDistances, setVendorDistances] = useState<Record<string, string>>({});
  const [marketDistances, setMarketDistances] = useState<Record<string, string>>({});
  const [isLoadingMarketDistances, setIsLoadingMarketDistances] = useState(false);
  const [locationMethod, setLocationMethod] = useState<'ip' | 'gps'>('ip');
  const [isGettingGPSLocation, setIsGettingGPSLocation] = useState(false);
  const [marketGoogleRatings, setMarketGoogleRatings] = useState<Record<string, {rating: number; reviewCount: number}>>({});

  // Calculate distances for all vendors (synchronized with market calculation)
  const calculateVendorDistances = async (vendors: AcceptedSubmission[], userCoords: {lat: number, lng: number}) => {
    console.log('=== VENDOR DISTANCE CALCULATION (SYNCHRONIZED WITH MARKETS) ===');
    console.log('User coordinates:', userCoords);
    console.log('Starting synchronized distance calculations for', vendors.length, 'vendors');
    
    const distances: Record<string, string> = {};
    
    for (const vendor of vendors) {
      console.log('\n--- Processing vendor:', vendor.store_name);
      console.log('Market address:', vendor.market_address);
      
      if (!vendor.market_address) {
        console.log('No market address for vendor:', vendor.store_name);
        distances[vendor.id] = '-- miles';
        continue;
      }

      try {
        // USE THE SAME COORDINATE SOURCE AS MARKET DISTANCE CALCULATION
        // This ensures vendor and market cards show identical distances
        const vendorCoords = await getCoordinatesForAddress(vendor.market_address);
        console.log('🔄 Using geocoded coordinates (same as market calculation):', vendorCoords);
        
        if (vendorCoords) {
          console.log('=== DISTANCE CALCULATION ===');
          console.log('User coords:', userCoords);
          console.log('Vendor coords:', vendorCoords);
          
          // Try Google Maps distance first, fall back to Haversine calculation
          const googleDistance = await getGoogleMapsDistance(
            userCoords.lat, 
            userCoords.lng, 
            vendorCoords.lat, 
            vendorCoords.lng
          );
          
          let finalDistance: string;
          
          if (googleDistance) {
            console.log('✅ Using Google Maps distance:', googleDistance.distance);
            finalDistance = googleDistance.distance;
          } else {
            console.log('⚠️ Google Maps failed, using Haversine calculation');
            const distanceInMiles = calculateDistance(
              userCoords.lat, 
              userCoords.lng, 
              vendorCoords.lat, 
              vendorCoords.lng
            );
            finalDistance = `${distanceInMiles.toFixed(1)} miles`;
          }
          
          console.log('Final synchronized distance:', finalDistance);
          console.log('Google Maps equivalent: https://maps.google.com/maps?saddr=' + userCoords.lat + ',' + userCoords.lng + '&daddr=' + vendorCoords.lat + ',' + vendorCoords.lng);
          
          distances[vendor.id] = finalDistance;
        } else {
          console.log('No coordinates returned for vendor:', vendor.id);
          distances[vendor.id] = '-- miles';
        }
      } catch (error) {
        console.error(`Error calculating distance for vendor ${vendor.id}:`, error);
        distances[vendor.id] = '-- miles';
      }
    }
    
    console.log('Final synchronized distances:', distances);
    console.log('=== END VENDOR DISTANCE CALCULATION ===');
    setVendorDistances(distances);
  };

  // Calculate distances when vendors or user coordinates change
  useEffect(() => {
    if (acceptedSubmissions.length > 0 && userCoordinates) {
      calculateVendorDistances(acceptedSubmissions, userCoordinates);
    }
  }, [acceptedSubmissions, userCoordinates]);

  // Simplified component return focusing on vendor cards with distance badges
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Vendors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {acceptedSubmissions.map((submission) => (
              <Card 
                key={submission.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer min-h-[450px]" 
                onClick={async () => {
                  const cachedCoords = submission.market_address 
                    ? await cacheVendorCoordinates(submission.id, submission.market_address)
                    : null;
                  
                  navigate('/market', { 
                    state: { 
                      type: 'vendor', 
                      selectedVendor: submission,
                      allVendors: acceptedSubmissions,
                      marketCoordinates: cachedCoords
                    } 
                  });
                }}
              >
                {/* Image Section */}
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {submission.products && 
                   submission.products.length > 0 && 
                   submission.products[0].images && 
                   submission.products[0].images.length > 0 ? (
                    <img 
                      src={submission.products[0].images[0]}
                      alt={submission.store_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                      <div className="text-green-600 text-lg font-medium">
                        {submission.store_name}
                      </div>
                    </div>
                  )}
                  
                  {/* Rating - Top Left */}
                  <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs font-medium">
                        {vendorRatings[submission.id]?.totalReviews > 0 
                          ? vendorRatings[submission.id].averageRating.toFixed(1)
                          : '0.0'
                        }
                      </span>
                      <span className="text-xs text-gray-600">
                        ({vendorRatings[submission.id]?.totalReviews || 0})
                      </span>
                    </div>
                  </div>
                  
                  {/* Like Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await toggleLike(submission.id, 'vendor');
                    }}
                  >
                    <Heart 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isLiked(submission.id, 'vendor') 
                          ? "text-red-500 fill-current" 
                          : "text-gray-600"
                      )} 
                    />
                  </Button>

                  {/* Distance Badge - Bottom Right */}
                  <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                    <span className="text-xs font-medium text-gray-700">
                      {vendorDistances[submission.id] || '-- miles'}
                    </span>
                  </div>
                </div>
                
                {/* Store Information */}
                <div className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground text-left">
                    {submission.store_name.length > 20 
                      ? `${submission.store_name.slice(0, 20)}...`
                      : submission.store_name
                    }
                  </h3>
                  
                  {submission.primary_specialty && (
                    <Badge variant="secondary" className="text-xs">
                      {submission.primary_specialty}
                    </Badge>
                  )}

                  {/* Market Details Section */}
                  <div className="mt-2">
                    <h4 className="text-sm font-semibold text-foreground mb-1">
                      {submission.selected_market || submission.search_term || "Farmers Market"}
                    </h4>
                    {submission.market_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                          {submission.market_address}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;