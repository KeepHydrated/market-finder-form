import { useState, useEffect } from "react";
import { Heart, MapPin, Store, Package, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useLikes, LikeType } from "@/hooks/useLikes";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { calculateDistance, getGoogleMapsDistance, cacheVendorCoordinates } from "@/lib/geocoding";
import { useToast } from "@/hooks/use-toast";
import { ProductDetailModal } from "@/components/ProductDetailModal";

type TabType = "markets" | "vendors" | "products";

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

// Map tab types to like types
const tabToLikeType = (tab: TabType): LikeType => {
  switch (tab) {
    case "markets": return "market";
    case "vendors": return "vendor";
    case "products": return "product";
  }
};

const Likes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("vendors");
  const { likes, loading, toggleLike, isLiked } = useLikes();
  const [acceptedSubmissions, setAcceptedSubmissions] = useState<AcceptedSubmission[]>([]);
  const [vendorRatings, setVendorRatings] = useState<Record<string, VendorRating>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [vendorDistances, setVendorDistances] = useState<Record<string, string>>({});
  const [locationMethod, setLocationMethod] = useState<'ip' | 'gps'>('ip');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentVendorProducts, setCurrentVendorProducts] = useState<any[]>([]);
  const [currentVendorInfo, setCurrentVendorInfo] = useState<{id: string; name: string} | null>(null);

  const tabs = [
    { id: "vendors" as TabType, title: "Vendors", icon: Store },
    { id: "markets" as TabType, title: "Markets", icon: MapPin },
    { id: "products" as TabType, title: "Products", icon: Package },
  ];

  useEffect(() => {
    if (user && (activeTab === "markets" || activeTab === "vendors" || activeTab === "products")) {
      fetchAcceptedSubmissions();
    }
  }, [user, activeTab]);

  // Calculate distances when vendors or user coordinates change
  useEffect(() => {
    if (acceptedSubmissions.length > 0 && userCoordinates) {
      calculateVendorDistances(acceptedSubmissions, userCoordinates);
    }
  }, [acceptedSubmissions, userCoordinates]);

  // Initialize location detection
  useEffect(() => {
    getLocationFromIP();
  }, []);

  const fetchAcceptedSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsedSubmissions = data?.map(sub => ({
        ...sub,
        products: typeof sub.products === 'string' ? JSON.parse(sub.products) : sub.products,
        market_hours: sub.market_hours && typeof sub.market_hours === 'object' && sub.market_hours !== null 
          ? sub.market_hours as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
          : undefined
      })) || [];
      
      setAcceptedSubmissions(parsedSubmissions);
      
      // Fetch ratings for all vendors
      const vendorIds = parsedSubmissions.map(sub => sub.id);
      if (vendorIds.length > 0) {
        await fetchVendorRatings(vendorIds);
      }
    } catch (error) {
      console.error('Error fetching accepted submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchVendorRatings = async (vendorIds: string[]) => {
    if (vendorIds.length === 0) return;

    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('vendor_id, rating')
        .in('vendor_id', vendorIds);

      if (error) throw error;

      // Calculate ratings for each vendor
      const ratingsMap: Record<string, VendorRating> = {};
      
      vendorIds.forEach(vendorId => {
        const vendorReviews = reviews?.filter(review => review.vendor_id === vendorId) || [];
        
        if (vendorReviews.length > 0) {
          const totalRating = vendorReviews.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = totalRating / vendorReviews.length;
          
          ratingsMap[vendorId] = {
            vendorId,
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews: vendorReviews.length
          };
        } else {
          ratingsMap[vendorId] = {
            vendorId,
            averageRating: 0,
            totalReviews: 0
          };
        }
      });

      setVendorRatings(ratingsMap);
    } catch (error) {
      console.error('Error fetching vendor ratings:', error);
    }
  };

  // Calculate distances for all vendors
  const calculateVendorDistances = async (vendors: AcceptedSubmission[], userCoords: {lat: number, lng: number}) => {
    const distances: Record<string, string> = {};
    
    for (const vendor of vendors) {
      if (!vendor.market_address) {
        distances[vendor.id] = '-- miles';
        continue;
      }

      try {
        // Get coordinates for this vendor (with caching)
        const vendorCoords = await cacheVendorCoordinates(vendor.id, vendor.market_address);
        
        if (vendorCoords) {
          // Try Google Maps distance first, fall back to Haversine calculation
          const googleDistance = await getGoogleMapsDistance(
            userCoords.lat, 
            userCoords.lng, 
            vendorCoords.lat, 
            vendorCoords.lng
          );
          
          let finalDistance: string;
          
          if (googleDistance) {
            finalDistance = googleDistance.distance;
          } else {
            const distanceInMiles = calculateDistance(
              userCoords.lat, 
              userCoords.lng, 
              vendorCoords.lat, 
              vendorCoords.lng
            );
            finalDistance = `${distanceInMiles.toFixed(1)} miles`;
          }
          
          distances[vendor.id] = finalDistance;
        } else {
          distances[vendor.id] = '-- miles';
        }
      } catch (error) {
        console.error(`Error calculating distance for vendor ${vendor.id}:`, error);
        distances[vendor.id] = '-- miles';
      }
    }
    
    setVendorDistances(distances);
  };

  // Get location from IP address automatically
  const getLocationFromIP = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        setUserCoordinates({ 
          lat: data.latitude, 
          lng: data.longitude 
        });
        setLocationMethod('ip');
      } else {
        // Set a default location (San Antonio area) for testing
        setUserCoordinates({ 
          lat: 29.4241, 
          lng: -98.4936 
        });
        setLocationMethod('ip');
      }
    } catch (error) {
      console.log('IP geolocation failed, using default location');
      // Set a default location (San Antonio area) for testing
      setUserCoordinates({ 
        lat: 29.4241, 
        lng: -98.4936 
      });
      setLocationMethod('ip');
    }
  };

  // Try GPS location first, fallback to IP if denied or fails
  const tryGPSLocationFirst = async () => {
    try {
      if (!navigator.geolocation) {
        getLocationFromIP();
        return;
      }

      // Try GPS first with a short timeout
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Store user coordinates for distance calculations
            setUserCoordinates({ lat: latitude, lng: longitude });
            setLocationMethod('gps');
          } catch (error) {
            console.error('GPS geocoding error:', error);
            // Still keep the GPS coordinates even if zipcode lookup fails
          }
        },
        (error) => {
          // GPS failed or denied, fallback to IP
          getLocationFromIP();
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000
        }
      );
    } catch (error) {
      console.error('Error in tryGPSLocationFirst function:', error);
      getLocationFromIP();
    }
  };

  // Group vendors by market for liked markets
  const groupLikedMarkets = () => {
    const likedMarketIds = likes
      .filter(like => like.item_type === 'market')
      .map(like => like.item_id);

    const markets: Record<string, {
      id: string;
      name: string;
      address: string;
      vendors: AcceptedSubmission[];
    }> = {};

    acceptedSubmissions.forEach(submission => {
      const marketKey = submission.selected_market || submission.search_term || 'Unknown Market';
      const marketAddress = submission.market_address || 'Address not available';
      const marketId = `${marketKey}-${marketAddress}`.replace(/\s+/g, '-').toLowerCase();
      
      // Only include markets that are liked
      if (likedMarketIds.includes(marketId)) {
        if (!markets[marketKey]) {
          markets[marketKey] = {
            id: marketId,
            name: marketKey,
            address: marketAddress,
            vendors: []
          };
        }
        
        markets[marketKey].vendors.push(submission);
      }
    });

    return Object.values(markets);
  };

  const getFilteredLikes = (tabType: TabType) => {
    const likeType = tabToLikeType(tabType);
    return likes.filter(like => like.item_type === likeType);
  };

  const renderLikedItems = (tabType: TabType) => {
    if (tabType === "markets") {
      return renderLikedMarkets();
    } else if (tabType === "vendors") {
      return renderLikedVendors();
    } else if (tabType === "products") {
      return renderLikedProducts();
    }
    
    // Fallback for unexpected tab types
    return null;
  };

  const renderLikedProducts = () => {
    if (loading || loadingSubmissions) {
      return (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading your liked products...</p>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground">
            Please sign in to view your liked products
          </p>
        </div>
      );
    }

    const likedProductIds = likes
      .filter(like => like.item_type === 'product')
      .map(like => like.item_id);
    
    // Get all products from all vendors and filter by liked IDs
    const allProducts: any[] = [];
    acceptedSubmissions.forEach(vendor => {
      if (vendor.products && Array.isArray(vendor.products)) {
        vendor.products.forEach((product: any) => {
          allProducts.push({
            ...product,
            vendorName: vendor.store_name,
            vendorId: vendor.id,
            // Create the same ID format used in ProductDetailModal
            likeId: `${vendor.id}-${product.id}`
          });
        });
      }
    });
    
    const likedProducts = allProducts.filter(product => 
      likedProductIds.includes(product.likeId)
    );

    if (likedProducts.length === 0) {
      return (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Liked Products</h2>
          <p className="text-muted-foreground">
            Products you like will appear here
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {likedProducts.map((product, index) => (
          <Card 
            key={index}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => {
              // Set up the product modal data
              const vendor = acceptedSubmissions.find(v => v.id === product.vendorId);
              if (vendor && vendor.products) {
                setCurrentVendorProducts(vendor.products);
                setCurrentVendorInfo({ id: vendor.id, name: vendor.store_name });
                setSelectedProduct(product);
                setIsProductModalOpen(true);
              }
            }}
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted relative group">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-opacity duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No Image
                </div>
              )}
              
              {/* Like Button */}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  await toggleLike(product.likeId, 'product');
                }}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isLiked(product.likeId, 'product')
                      ? "text-red-500 fill-current" 
                      : "text-gray-600"
                  )} 
                />
              </Button>
            </div>
            
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-normal text-sm flex-1 text-black">{product.name}</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  ${product.price ? product.price.toFixed(2) : '0.00'}
                </span>
              </div>
              {product.vendorName && (
                <div className="mt-2 pt-2 border-t border-muted">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/market?vendor=${product.vendorId}`);
                    }}
                    className="text-xs text-black hover:underline cursor-pointer"
                  >
                    {product.vendorName}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderLikedVendors = () => {
    if (loading || loadingSubmissions) {
      return (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading your liked vendors...</p>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground">
            Please sign in to view your liked vendors
          </p>
        </div>
      );
    }

    const likedVendorIds = likes
      .filter(like => like.item_type === 'vendor')
      .map(like => like.item_id);
    
    const likedVendors = acceptedSubmissions.filter(vendor => 
      likedVendorIds.includes(vendor.id)
    );

    if (likedVendors.length === 0) {
      return (
        <div className="text-center py-16">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Liked Vendors</h2>
          <p className="text-muted-foreground">
            Vendors you like will appear here
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {likedVendors.map((vendor) => (
          <Card 
            key={vendor.id}
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" 
            onClick={async () => {
              // Get the same cached coordinates used for distance calculation
              const cachedCoords = vendor.market_address 
                ? await cacheVendorCoordinates(vendor.id, vendor.market_address)
                : null;
              
              navigate('/market', { 
                state: { 
                  type: 'vendor', 
                  selectedVendor: vendor,
                  allVendors: acceptedSubmissions,
                  marketCoordinates: cachedCoords
                } 
              });
            }}
          >
            {/* Product Image */}
            <div className="aspect-[4/3] bg-muted relative">
              {vendor.products && vendor.products.length > 0 && vendor.products[0].images && vendor.products[0].images.length > 0 ? (
                <img 
                  src={vendor.products[0].images[0]} 
                  alt={vendor.products[0].name || 'Product'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No Image Available
                </div>
              )}
              
              {/* Rating - Top Left */}
              <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-xs font-medium">
                    {vendorRatings[vendor.id]?.totalReviews > 0 ? vendorRatings[vendor.id]?.averageRating.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-xs text-gray-600">
                    ({vendorRatings[vendor.id]?.totalReviews || 0})
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
                  await toggleLike(vendor.id, 'vendor');
                }}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isLiked(vendor.id, 'vendor') 
                      ? "text-red-500 fill-current" 
                      : "text-gray-600"
                  )} 
                />
              </Button>

              {/* Distance Badge */}
              <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                <span className="text-xs font-medium text-gray-700">
                  {vendorDistances[vendor.id] || '-- miles'}
                </span>
              </div>
            </div>
            
            {/* Store Information */}
            <div className="p-4 space-y-3">
              <h3 className="text-lg font-semibold text-foreground text-left">
                {vendor.store_name.length > 20 
                  ? `${vendor.store_name.slice(0, 20)}...`
                  : vendor.store_name
                }
              </h3>
              
              {vendor.primary_specialty && (
                <Badge variant="secondary" className="text-xs">
                  {vendor.primary_specialty}
                </Badge>
              )}

              {/* Market Details Section - Moved to bottom */}
              <div className="mt-2">
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  {vendor.selected_market || vendor.search_term || "Farmers Market"}
                </h4>
                {vendor.market_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      {vendor.market_address.replace(/,\s*United States\s*$/i, '').trim()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderLikedMarkets = () => {
    if (loading || loadingSubmissions) {
      return (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading your liked markets...</p>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground">
            Please sign in to view your liked markets
          </p>
        </div>
      );
    }

    const likedMarkets = groupLikedMarkets();

    if (likedMarkets.length === 0) {
      return (
        <div className="text-center py-16">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Liked Markets</h2>
          <p className="text-muted-foreground">
            Markets you like will appear here
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {likedMarkets.map((market, index) => (
          <Card 
            key={index}
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              navigate('/market');
            }}
          >
            {/* Vendor Images Collage */}
            <div className="aspect-video bg-muted relative overflow-hidden">
              {market.vendors.length === 1 ? (
                // Single vendor - show their product image or placeholder
                <div className="w-full h-full">
                  {market.vendors[0].products && 
                   market.vendors[0].products.length > 0 && 
                   market.vendors[0].products[0].images && 
                   market.vendors[0].products[0].images.length > 0 ? (
                    <img 
                      src={market.vendors[0].products[0].images[0]}
                      alt={market.vendors[0].store_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                      <div className="text-green-600 text-lg font-medium">
                        {market.vendors[0].store_name}
                      </div>
                    </div>
                  )}
                </div>
              ) : market.vendors.length === 2 ? (
                // Two vendors - split layout
                <div className="grid grid-cols-2 h-full gap-0.5">
                  {market.vendors.slice(0, 2).map((vendor, vendorIndex) => (
                    <div key={vendorIndex} className="relative overflow-hidden">
                      {vendor.products && 
                       vendor.products.length > 0 && 
                       vendor.products[0].images && 
                       vendor.products[0].images.length > 0 ? (
                        <img 
                          src={vendor.products[0].images[0]}
                          alt={vendor.store_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                          <div className="text-green-600 text-sm font-medium text-center">
                            {vendor.store_name}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : market.vendors.length === 3 ? (
                // Three vendors - one large, two small
                <div className="grid grid-cols-2 h-full gap-0.5">
                  <div className="relative overflow-hidden">
                    {market.vendors[0].products && 
                     market.vendors[0].products.length > 0 && 
                     market.vendors[0].products[0].images && 
                     market.vendors[0].products[0].images.length > 0 ? (
                      <img 
                        src={market.vendors[0].products[0].images[0]}
                        alt={market.vendors[0].store_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                        <div className="text-green-600 text-sm font-medium text-center">
                          {market.vendors[0].store_name}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-rows-2 gap-0.5">
                    {market.vendors.slice(1, 3).map((vendor, vendorIndex) => (
                      <div key={vendorIndex} className="relative overflow-hidden">
                        {vendor.products && 
                         vendor.products.length > 0 && 
                         vendor.products[0].images && 
                         vendor.products[0].images.length > 0 ? (
                          <img 
                            src={vendor.products[0].images[0]}
                            alt={vendor.store_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                            <div className="text-green-600 text-xs font-medium text-center p-1">
                              {vendor.store_name}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Four or more vendors - 2x2 grid
                <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                  {market.vendors.slice(0, 4).map((vendor, vendorIndex) => (
                    <div key={vendorIndex} className="relative overflow-hidden">
                      {vendor.products && 
                       vendor.products.length > 0 && 
                       vendor.products[0].images && 
                       vendor.products[0].images.length > 0 ? (
                        <img 
                          src={vendor.products[0].images[0]}
                          alt={vendor.store_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                          <div className="text-green-600 text-xs font-medium text-center p-1">
                            {vendor.store_name}
                          </div>
                        </div>
                      )}
                      {vendorIndex === 3 && market.vendors.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            +{market.vendors.length - 4} more
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Market Rating - Top Left */}
              <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-xs font-medium">
                    {(() => {
                      const marketVendorRatings = market.vendors
                        .map(vendor => vendorRatings[vendor.id])
                        .filter(rating => rating && rating.totalReviews > 0);
                      
                      if (marketVendorRatings.length === 0) return '0.0';
                      
                      const totalRating = marketVendorRatings.reduce((sum, rating) => sum + rating.averageRating, 0);
                      const averageRating = totalRating / marketVendorRatings.length;
                      return averageRating.toFixed(1);
                    })()}
                  </span>
                  <span className="text-xs text-gray-600">
                    ({(() => {
                      const totalReviews = market.vendors.reduce((sum, vendor) => {
                        const rating = vendorRatings[vendor.id];
                        return sum + (rating ? rating.totalReviews : 0);
                      }, 0);
                      return totalReviews;
                    })()})
                  </span>
                </div>
              </div>

              {/* Heart Button - Top Right */}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  await toggleLike(market.id, 'market');
                }}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isLiked(market.id, 'market')
                      ? "text-red-500 fill-current" 
                      : "text-gray-600"
                  )} 
                />
              </Button>
              
              {/* Distance Badge - Bottom Right */}
              <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                <span className="text-xs font-medium text-gray-700">
                  {`${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 9)} miles`}
                </span>
              </div>
            </div>

            {/* Market Information */}
            <div className="p-4 space-y-3">
              <h3 className="text-lg font-semibold text-black">
                {market.name}
              </h3>
              
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {market.address}
                </p>
              </div>
              
              <p className="text-sm text-black">
                {market.vendors.length} vendor{market.vendors.length !== 1 ? 's' : ''}
              </p>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    return renderLikedItems(activeTab);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="w-60" collapsible="none">
          <SidebarContent className="pt-6">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tabs.map((tab) => (
                    <SidebarMenuItem key={tab.id}>
                      <SidebarMenuButton 
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full justify-start ${
                          activeTab === tab.id 
                            ? "bg-muted text-primary font-medium" 
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <tab.icon className="mr-2 h-4 w-4" />
                        <span>{tab.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1">
          <div className="container mx-auto px-4 py-6">
            {renderContent()}
          </div>
        </main>
      </div>
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        products={currentVendorProducts}
        open={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
        onProductChange={(product) => setSelectedProduct(product)}
        vendorId={currentVendorInfo?.id}
        vendorName={currentVendorInfo?.name}
      />
    </SidebarProvider>
  );
};

export default Likes;