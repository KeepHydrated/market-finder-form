import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Star, MapPin, Search, Loader2, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";
import { ProductDetailModal } from "@/components/ProductDetailModal";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
}

interface Vendor {
  id: string;
  store_name: string;
  primary_specialty: string;
  description: string;
  products: Product[];
  google_rating: number | null;
  google_rating_count: number | null;
  market_address: string | null;
  latitude: number | null;
  longitude: number | null;
  selected_markets?: any;
  market_days?: string[];
}

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
  google_place_id: string | null;
  vendors?: Vendor[];
  distance?: number;
  latitude?: number;
  longitude?: number;
}

const CATEGORIES = [
  "Fresh Flowers & Plants",
  "Bakery",
  "Dairy",
  "Rancher",
  "Beverages",
  "Farmers",
  "Produce",
  "Artisan",
  "Honey & Preserves",
  "Seafood"
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toggleLike, isLiked } = useLikes();
  
  // View mode: vendors, markets, or products
  const [viewMode, setViewMode] = useState<'vendors' | 'markets' | 'products'>('vendors');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('category') ? [searchParams.get('category')!] : []
  );
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Data state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Location state
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [vendorDistances, setVendorDistances] = useState<Record<string, string>>({});
  const [vendorMarketIndices, setVendorMarketIndices] = useState<Record<string, number>>({});
  
  // Vendor ratings from reviews
  const [vendorRatings, setVendorRatings] = useState<Record<string, {averageRating: number; totalReviews: number}>>({});
  
  // Market photos
  const [marketPhotos, setMarketPhotos] = useState<Record<number, string | null>>({});
  
  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentVendorProducts, setCurrentVendorProducts] = useState<any[]>([]);
  const [currentVendorId, setCurrentVendorId] = useState<string | undefined>(undefined);
  const [currentVendorName, setCurrentVendorName] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchVendors();
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userCoordinates) {
      fetchMarkets();
    }
  }, [userCoordinates]);

  const getUserLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        async () => {
          // Try Google Geolocation API
          try {
            const { data, error } = await supabase.functions.invoke('wifi-geolocation');
            if (!error && data?.lat && data?.lng) {
              setUserCoordinates({ lat: data.lat, lng: data.lng });
            }
          } catch (err) {
            console.error('Error getting location:', err);
          }
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  };

  const fetchVendors = async () => {
    try {
      const { data: vendorsData, error } = await supabase
        .from('submissions')
        .select('id, store_name, primary_specialty, description, products, google_rating, google_rating_count, market_address, latitude, longitude, selected_markets, market_days')
        .eq('status', 'accepted')
        .not('products', 'is', null);

      if (error) throw error;

      setVendors((vendorsData || []) as unknown as Vendor[]);
      
      // Fetch ratings for vendors
      if (vendorsData && vendorsData.length > 0) {
        fetchVendorRatings(vendorsData.map(v => v.id));
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
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

      const ratingsMap: Record<string, {averageRating: number; totalReviews: number}> = {};
      
      vendorIds.forEach(vendorId => {
        const vendorReviews = reviews?.filter(review => review.vendor_id === vendorId) || [];
        
        if (vendorReviews.length > 0) {
          const reviewsWithRatings = vendorReviews.filter(review => review.rating && review.rating > 0);
          if (reviewsWithRatings.length > 0) {
            const totalRating = reviewsWithRatings.reduce((sum, review) => sum + review.rating!, 0);
            const averageRating = totalRating / reviewsWithRatings.length;
            
            ratingsMap[vendorId] = {
              averageRating: Math.round(averageRating * 10) / 10,
              totalReviews: vendorReviews.length
            };
          } else {
            ratingsMap[vendorId] = { averageRating: 0, totalReviews: vendorReviews.length };
          }
        } else {
          ratingsMap[vendorId] = { averageRating: 0, totalReviews: 0 };
        }
      });

      setVendorRatings(ratingsMap);
    } catch (error) {
      console.error('Error fetching vendor ratings:', error);
    }
  };

  const fetchMarkets = async () => {
    if (!userCoordinates) return;

    try {
      const { data, error } = await supabase.functions.invoke('farmers-market-search', {
        body: {
          query: 'farmers market',
          location: userCoordinates
        }
      });

      if (error) throw error;

      if (!data?.predictions || data.predictions.length === 0) {
        setMarkets([]);
        return;
      }

      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 3959;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const marketsFromGoogle: Market[] = data.predictions.map((place: any, index: number) => {
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        
        let distance: number | undefined;
        if (lat && lng && userCoordinates) {
          distance = calculateDistance(userCoordinates.lat, userCoordinates.lng, lat, lng);
        }

        let openDays: string[] = [];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        if (place.opening_hours?.periods) {
          const dayIndices = new Set<number>();
          place.opening_hours.periods.forEach((period: any) => {
            if (period.open?.day !== undefined) {
              dayIndices.add(period.open.day);
            }
          });
          openDays = Array.from(dayIndices).sort().map(dayIndex => dayNames[dayIndex]);
        }

        return {
          id: index + 1,
          name: place.name || 'Farmers Market',
          address: place.address || place.formatted_address || place.vicinity || '',
          city: '',
          state: '',
          days: openDays,
          hours: place.opening_hours?.weekday_text?.join(', ') || null,
          google_rating: place.rating || null,
          google_rating_count: place.user_ratings_total || null,
          google_place_id: place.place_id,
          vendors: [],
          distance,
          latitude: lat,
          longitude: lng
        };
      });

      const sortedMarkets = marketsFromGoogle.sort((a, b) => 
        (a.distance ?? Infinity) - (b.distance ?? Infinity)
      );

      setMarkets(sortedMarkets);
    } catch (error) {
      console.error('Error fetching markets:', error);
      setMarkets([]);
    }
  };

  // Fetch market photos
  useEffect(() => {
    const fetchMarketPhotos = async () => {
      const photoPromises = markets
        .filter(market => market.google_place_id && !marketPhotos[market.id])
        .map(async (market) => {
          try {
            const { data, error } = await supabase.functions.invoke('get-place-photo', {
              body: { place_id: market.google_place_id }
            });
            if (!error && data?.photoUrl) {
              return { id: market.id, url: data.photoUrl };
            }
          } catch (error) {
            console.error('Error fetching market photo:', error);
          }
          return null;
        });
      
      const results = await Promise.all(photoPromises);
      const newPhotos: Record<number, string | null> = {};
      results.forEach(result => {
        if (result) newPhotos[result.id] = result.url;
      });
      if (Object.keys(newPhotos).length > 0) {
        setMarketPhotos(prev => ({ ...prev, ...newPhotos }));
      }
    };
    
    if (markets.length > 0) {
      fetchMarketPhotos();
    }
  }, [markets]);

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = vendor.store_name.toLowerCase().includes(query);
        const matchesSpecialty = vendor.primary_specialty?.toLowerCase().includes(query);
        const matchesDescription = vendor.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesSpecialty && !matchesDescription) {
          return false;
        }
      }
      
      // Category filter
      if (selectedCategories.length > 0) {
        if (!vendor.primary_specialty || !selectedCategories.some(cat => 
          vendor.primary_specialty.toLowerCase().includes(cat.toLowerCase())
        )) {
          return false;
        }
      }
      
      // Day filter
      if (selectedDays.length > 0) {
        if (!vendor.market_days || !selectedDays.some(day => 
          vendor.market_days!.includes(day)
        )) {
          return false;
        }
      }
      
      return true;
    });
  }, [vendors, searchQuery, selectedCategories, selectedDays]);

  // Filter markets
  const filteredMarkets = useMemo(() => {
    return markets.filter(market => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = market.name.toLowerCase().includes(query);
        const matchesAddress = market.address.toLowerCase().includes(query);
        if (!matchesName && !matchesAddress) {
          return false;
        }
      }
      
      // Day filter
      if (selectedDays.length > 0) {
        if (!market.days || !selectedDays.some(day => market.days.includes(day))) {
          return false;
        }
      }
      
      return true;
    });
  }, [markets, searchQuery, selectedDays]);

  // Get all products from vendors
  const allProducts = useMemo(() => {
    const products: Array<Product & { vendorId: string; vendorName: string }> = [];
    
    filteredVendors.forEach(vendor => {
      const vendorProducts = vendor.products as unknown as Product[];
      if (vendorProducts && Array.isArray(vendorProducts)) {
        vendorProducts.forEach(product => {
          if (product.images && product.images.length > 0) {
            products.push({
              ...product,
              vendorId: vendor.id,
              vendorName: vendor.store_name
            });
          }
        });
      }
    });
    
    // Filter by category if specified
    if (selectedCategories.length > 0) {
      return products.filter(product => 
        selectedCategories.some(cat => 
          product.category?.toLowerCase().includes(cat.toLowerCase())
        )
      );
    }
    
    return products;
  }, [filteredVendors, selectedCategories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedDays([]);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedDays.length > 0 || searchQuery;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Discover Local</h1>
          <p className="text-muted-foreground">Find vendors, markets, and products near you</p>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors, markets, products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {selectedCategories.length + selectedDays.length + (searchQuery ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Categories */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => (
                  <Badge
                    key={category}
                    variant={selectedCategories.includes(category) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Days */}
            <div>
              <p className="text-sm font-medium mb-2">Days Open</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <Badge
                    key={day}
                    variant={selectedDays.includes(day) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDay(day)}
                  >
                    {day.slice(0, 3)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="vendors">
              Vendors ({filteredVendors.length})
            </TabsTrigger>
            <TabsTrigger value="markets">
              Markets ({filteredMarkets.length})
            </TabsTrigger>
            <TabsTrigger value="products">
              Products ({allProducts.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Results */}
        {viewMode === 'vendors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No vendors found matching your criteria.</p>
              </div>
            ) : (
              filteredVendors.map((vendor) => {
                const products = vendor.products as unknown as Product[];
                const firstProductImage = products?.[0]?.images?.[0];
                
                return (
                  <Card
                    key={vendor.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate('/market', { 
                      state: { type: 'vendor', selectedVendor: vendor } 
                    })}
                  >
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {firstProductImage ? (
                        <img
                          src={firstProductImage}
                          alt={vendor.store_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                      
                      {/* Rating */}
                      <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs font-medium">
                            {(vendorRatings[vendor.id]?.averageRating || 0).toFixed(1)}
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

                      {/* Category Badge */}
                      {vendor.primary_specialty && (
                        <Badge className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm shadow-sm border-0 rounded-full px-3 py-1.5">
                          <span className="font-medium text-sm text-green-600">{vendor.primary_specialty}</span>
                        </Badge>
                      )}
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {vendor.store_name.length > 25 
                          ? `${vendor.store_name.slice(0, 25)}...`
                          : vendor.store_name
                        }
                      </h3>

                      {vendor.market_address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {vendor.market_address.replace(/,\s*United States\s*$/i, '').trim()}
                          </p>
                        </div>
                      )}

                      {vendor.market_days && vendor.market_days.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {vendor.market_days.map((day: string) => (
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
                  </Card>
                );
              })
            )}
          </div>
        )}

        {viewMode === 'markets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No markets found. Enable location to see markets near you.</p>
              </div>
            ) : (
              filteredMarkets.map((market) => (
                <Card
                  key={market.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer rounded-2xl"
                  onClick={() => navigate('/market', { 
                    state: { type: 'market', selectedMarket: { ...market, vendors: [] } } 
                  })}
                >
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {market.google_rating && (
                      <div className="absolute top-2 left-2 z-10 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs font-medium">
                            {market.google_rating.toFixed(1)}
                          </span>
                          {market.google_rating_count && (
                            <span className="text-xs text-gray-600">
                              ({market.google_rating_count})
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                        await toggleLike(marketId, 'market');
                      }}
                    >
                      <Heart 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          (() => {
                            const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                            return isLiked(marketId, 'market') 
                              ? "text-red-500 fill-current" 
                              : "text-gray-600";
                          })()
                        )} 
                      />
                    </Button>
                    
                    {marketPhotos[market.id] ? (
                      <img 
                        src={marketPhotos[market.id]!}
                        alt={market.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                        <span className="text-6xl">🏪</span>
                      </div>
                    )}

                    {market.distance !== undefined && market.distance !== Infinity && (
                      <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                        <span className="text-xs font-medium text-gray-700">
                          {market.distance.toFixed(1)} mi
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <h3 className="text-base font-semibold text-foreground">
                      {market.name}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {market.address.replace(/,\s*United States\s*$/i, '').trim()}
                      </p>
                    </div>

                    {market.days && market.days.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {market.days.map((day: string) => (
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
                </Card>
              ))
            )}
          </div>
        )}

        {viewMode === 'products' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {allProducts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No products found matching your criteria.</p>
              </div>
            ) : (
              allProducts.map((product) => (
                <Card
                  key={`${product.vendorId}-${product.id}`}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={async () => {
                    const { data: vendor } = await supabase
                      .from('submissions')
                      .select('products')
                      .eq('id', product.vendorId)
                      .maybeSingle();
                    
                    if (vendor) {
                      setSelectedProduct({ ...product, id: product.id });
                      setCurrentVendorId(product.vendorId);
                      setCurrentVendorName(product.vendorName);
                      const vendorProducts = vendor.products as unknown as Product[];
                      const productsWithIds = (vendorProducts || []).map((p: any, idx: number) => ({
                        ...p,
                        id: p.id || idx
                      }));
                      setCurrentVendorProducts(productsWithIds);
                      setIsProductModalOpen(true);
                    }
                  }}
                >
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await toggleLike(`${product.vendorId}-${product.id}`, 'product');
                      }}
                    >
                      <Heart 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isLiked(`${product.vendorId}-${product.id}`, 'product')
                            ? "text-red-500 fill-current" 
                            : "text-gray-600"
                        )}
                      />
                    </Button>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-normal text-sm text-foreground mb-2">
                      {product.name || 'Product'}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        ${(product.price || 0).toFixed(2)}
                      </span>
                    </div>
                    {product.vendorName && (
                      <div className="mt-2 pt-2 border-t border-muted">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const vendor = vendors.find(v => v.id === product.vendorId);
                            if (vendor) {
                              navigate('/market', { 
                                state: { type: 'vendor', selectedVendor: vendor } 
                              });
                            }
                          }}
                          className="text-xs text-muted-foreground hover:underline cursor-pointer"
                        >
                          {product.vendorName}
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        open={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={selectedProduct}
        products={currentVendorProducts}
        vendorId={currentVendorId}
        vendorName={currentVendorName}
      />
    </div>
  );
};

export default SearchPage;
