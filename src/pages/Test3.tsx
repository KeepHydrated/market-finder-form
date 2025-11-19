import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useLikes } from "@/hooks/useLikes";
import { getCoordinatesForAddress, calculateDistance } from "@/lib/geocoding";

interface AcceptedSubmission {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any[];
  selected_market: string;
  selected_markets?: any;
  search_term: string;
  market_address?: string;
  market_days?: string[];
  market_hours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>;
  created_at: string;
  latitude?: number;
  longitude?: number;
  google_rating?: number;
  google_rating_count?: number;
  distance?: number;
}

interface VendorRating {
  vendorId: string;
  averageRating: number;
  totalReviews: number;
}

const Test3 = () => {
  const navigate = useNavigate();
  const { toggleLike, isLiked } = useLikes();
  const [recommendedVendors, setRecommendedVendors] = useState<AcceptedSubmission[]>([]);
  const [vendorRatings, setVendorRatings] = useState<Record<string, VendorRating>>({});
  const [vendorDistances, setVendorDistances] = useState<Record<string, string>>({});
  const [vendorMarketIndices, setVendorMarketIndices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    getUserLocation();
    fetchRecommendedVendors();
  }, []);

  const getUserLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.latitude && data.longitude) {
        setUserCoordinates({ lat: data.latitude, lng: data.longitude });
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const fetchRecommendedVendors = async () => {
    try {
      const { data: vendors, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'accepted')
        .not('products', 'is', null)
        .limit(20);

      if (error) throw error;

      if (vendors) {
        const vendorsWithImages = (vendors as any[]).filter((v: any) => {
          return v.products && Array.isArray(v.products) && v.products.some((p: any) => 
            p.images && Array.isArray(p.images) && p.images.length > 0
          );
        });

        const shuffled = vendorsWithImages.sort(() => 0.5 - Math.random()).slice(0, 9) as AcceptedSubmission[];
        setRecommendedVendors(shuffled);

        const { data: reviews } = await supabase
          .from('reviews')
          .select('vendor_id, rating')
          .in('vendor_id', shuffled.map((v: any) => v.id));

        if (reviews) {
          const ratingsMap: Record<string, VendorRating> = {};
          reviews.forEach((review: any) => {
            if (!ratingsMap[review.vendor_id]) {
              ratingsMap[review.vendor_id] = {
                vendorId: review.vendor_id,
                averageRating: 0,
                totalReviews: 0,
              };
            }
            ratingsMap[review.vendor_id].averageRating += review.rating || 0;
            ratingsMap[review.vendor_id].totalReviews += 1;
          });

          Object.keys(ratingsMap).forEach(vendorId => {
            ratingsMap[vendorId].averageRating = 
              ratingsMap[vendorId].averageRating / ratingsMap[vendorId].totalReviews;
          });

          setVendorRatings(ratingsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching recommended vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userCoordinates && recommendedVendors.length > 0) {
      calculateVendorDistances();
    }
  }, [userCoordinates, recommendedVendors]);

  const calculateVendorDistances = async () => {
    if (!userCoordinates) return;

    const distances: Record<string, string> = {};

    for (const vendor of recommendedVendors) {
      if (vendor.market_address) {
        try {
          const coords = await getCoordinatesForAddress(vendor.market_address);
          if (coords) {
            const distance = calculateDistance(
              userCoordinates.lat,
              userCoordinates.lng,
              coords.lat,
              coords.lng
            );
            distances[vendor.id] = `${distance.toFixed(1)} mi`;
          }
        } catch (error) {
          console.error('Error calculating distance:', error);
        }
      }
    }

    setVendorDistances(distances);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading recommended vendors...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Recommended Vendors</h1>
        
        {recommendedVendors.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground">No recommended vendors available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedVendors.map((submission) => (
              <Card 
                key={submission.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer rounded-2xl" 
                onClick={async () => {
                  const cachedCoords = submission.market_address 
                    ? await getCoordinatesForAddress(submission.market_address)
                    : null;
                  
                  navigate('/market', { 
                    state: { 
                      type: 'vendor', 
                      selectedVendor: submission,
                      allVendors: recommendedVendors,
                      marketCoordinates: cachedCoords
                    } 
                  });
                }}
              >
                <div className="aspect-[4/3] bg-muted relative">
                  {submission.products && submission.products.length > 0 && submission.products[0].images && submission.products[0].images.length > 0 ? (
                    <img 
                      src={submission.products[0].images[0]} 
                      alt={submission.products[0].name || 'Product'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image Available
                    </div>
                  )}
                  
                  {((submission.google_rating && submission.google_rating > 0) || (vendorRatings[submission.id]?.totalReviews > 0)) && (
                    <Badge className="absolute top-3 left-3 bg-white backdrop-blur-sm shadow-lg flex items-center gap-1.5 px-3 py-1.5 border-0 rounded-full hover:bg-white">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {submission.google_rating && submission.google_rating > 0
                          ? submission.google_rating.toFixed(1)
                          : vendorRatings[submission.id]?.averageRating.toFixed(1)
                        }
                      </span>
                      {(submission.google_rating_count || vendorRatings[submission.id]?.totalReviews) && (
                        <span className="text-sm text-gray-600">
                          ({submission.google_rating_count || vendorRatings[submission.id]?.totalReviews || 0})
                        </span>
                      )}
                    </Badge>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 h-11 w-11 p-0 bg-white hover:bg-white rounded-full shadow-lg border-0"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await toggleLike(submission.id, 'vendor');
                    }}
                  >
                    <Heart 
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isLiked(submission.id, 'vendor')
                          ? "text-red-500 fill-red-500" 
                          : "text-red-500"
                      )}
                    />
                  </Button>

                  {vendorDistances[submission.id] && vendorDistances[submission.id] !== '-- mi' && (
                    <Badge className="absolute bottom-3 right-3 bg-white backdrop-blur-sm shadow-lg border-0 rounded-full px-3 py-1.5 hover:bg-white">
                      <span className="font-semibold text-sm text-gray-900">{vendorDistances[submission.id]}</span>
                    </Badge>
                  )}
                </div>
                
                <div className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground text-left">
                    {submission.store_name.length > 20 
                      ? `${submission.store_name.slice(0, 20)}...`
                      : submission.store_name
                    }
                  </h3>

                  <div className="mt-2">
                    {(() => {
                      let allMarkets = [];
                      
                      try {
                        let marketsData = submission.selected_markets;
                        
                        if (typeof marketsData === 'string') {
                          try {
                            marketsData = JSON.parse(marketsData);
                          } catch (e) {
                            console.error('Failed to parse markets data:', e);
                          }
                        }
                        
                        if (Array.isArray(marketsData)) {
                          allMarkets = marketsData.filter(m => m && (typeof m === 'object' ? m.name || m.marketName : m));
                        }
                      } catch (error) {
                        console.error('Error processing markets:', error);
                      }

                      if (allMarkets.length === 0) {
                        return null;
                      }

                      const currentIndex = vendorMarketIndices[submission.id] || 0;
                      const currentMarket = allMarkets[currentIndex];
                      
                      const marketName = typeof currentMarket === 'object' 
                        ? (currentMarket.name || currentMarket.marketName)
                        : currentMarket;
                      
                      const marketAddress = typeof currentMarket === 'object'
                        ? currentMarket.address
                        : submission.market_address;

                      return (
                        <>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-foreground">
                                  {String(marketName)}
                                </h4>
                                {allMarkets.length > 1 && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setVendorMarketIndices(prev => ({
                                          ...prev,
                                          [submission.id]: currentIndex === 0 ? allMarkets.length - 1 : currentIndex - 1
                                        }));
                                      }}
                                      className="p-1 hover:bg-muted rounded transition-colors"
                                      aria-label="Previous market"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <span className="min-w-[2.5rem] text-center">
                                      {currentIndex + 1}/{allMarkets.length}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setVendorMarketIndices(prev => ({
                                          ...prev,
                                          [submission.id]: (currentIndex + 1) % allMarkets.length
                                        }));
                                      }}
                                      className="p-1 hover:bg-muted rounded transition-colors"
                                      aria-label="Next market"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              {marketAddress && (
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <p className="text-sm text-muted-foreground">
                                    {String(marketAddress).replace(/,\s*United States\s*$/i, '').trim()}
                                  </p>
                                </div>
                              )}
                              
                              {submission.market_days && submission.market_days.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {submission.market_days.map((day: string) => (
                                    <Badge 
                                      key={day} 
                                      className="text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-100 border-0"
                                    >
                                      {day}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Test3;
