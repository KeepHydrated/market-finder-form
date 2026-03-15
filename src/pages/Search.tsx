import { useState, useEffect, useMemo, useRef } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Star, MapPin, Search, Loader2, Filter, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Globe, MapPinned, RotateCcw } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [viewMode, setViewMode] = useState<'vendors' | 'markets' | 'products'>('products');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || searchParams.get('q') || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('category') ? [searchParams.get('category')!] : []
  );

  // Sync searchQuery with URL params when they change (e.g., from header search)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || searchParams.get('q') || '';
    setSearchQuery(urlSearch);
  }, [searchParams]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState<'relevancy' | 'lowest_price' | 'highest_price' | 'top_rated' | 'most_recent'>('relevancy');
  const [filterTab, setFilterTab] = useState<'times' | 'categories'>('times');
  const [locationFilter, setLocationFilter] = useState<'all' | 'local'>('all');
  const [selectedTimeDay, setSelectedTimeDay] = useState<string>('');
  const defaultTimeRange = { startHour: '12:00', startPeriod: 'AM', endHour: '11:30', endPeriod: 'PM' };
  const [dayTimeRanges, setDayTimeRanges] = useState<Record<string, {startHour: string; startPeriod: string; endHour: string; endPeriod: string}>>({});
  
  const getTimeRange = (day: string) => dayTimeRanges[day] || defaultTimeRange;
  const updateDayTimeRange = (day: string, update: Partial<{startHour: string; startPeriod: string; endHour: string; endPeriod: string}>) => {
    setDayTimeRanges(prev => ({
      ...prev,
      [day]: { ...getTimeRange(day), ...update }
    }));
  };
  
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

  // Filter panel ref for click-outside detection
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

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

  // Calculate total results
  const totalResults = viewMode === 'vendors' 
    ? filteredVendors.length 
    : viewMode === 'markets' 
      ? filteredMarkets.length 
      : allProducts.length;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Search Farmers Market Vendors & Products | From Farmers Markets"
        description="Browse and search for local farmers market vendors, fresh produce, flowers, baked goods, and more from small businesses across the US."
        path="/search"
      />
      <div className="container mx-auto px-4 py-8">
        
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-6 mb-4">
          {/* Filter Toggle Button */}
          <Button 
            ref={filterButtonRef}
            variant="outline" 
            className="gap-2 flex-shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filter
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* Inline Category Slider */}
          <div className="flex-1 min-w-0 overflow-hidden relative">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategories(prev => 
                      prev.includes(category) 
                        ? prev.filter(c => c !== category)
                        : [...prev, category]
                    );
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap flex-shrink-0",
                    selectedCategories.includes(category)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Dropdown - pinned right */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[160px] flex-shrink-0">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="relevancy" className="data-[state=checked]:bg-amber-100 data-[state=checked]:text-foreground">Relevancy</SelectItem>
              <SelectItem value="lowest_price" className="data-[state=checked]:bg-amber-100 data-[state=checked]:text-foreground">Lowest Price</SelectItem>
              <SelectItem value="highest_price" className="data-[state=checked]:bg-amber-100 data-[state=checked]:text-foreground">Highest Price</SelectItem>
              <SelectItem value="top_rated" className="data-[state=checked]:bg-amber-100 data-[state=checked]:text-foreground">Top Rated Store</SelectItem>
              <SelectItem value="most_recent" className="data-[state=checked]:bg-amber-100 data-[state=checked]:text-foreground">Most Recent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter panel content - shared between top and sidebar layouts */}
        {showFilters && (() => {
          const filterContent = (
            <div className="p-4 border rounded-lg bg-background">
              {/* Location Toggle */}
              <div className="mb-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Location</h3>
                <div className="flex items-center gap-1 border rounded-full p-1">
                  <button
                    onClick={() => setLocationFilter('all')}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-sm transition-colors rounded-full text-center",
                      locationFilter === 'all' 
                        ? "bg-muted text-foreground font-medium" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All of US
                  </button>
                  <button
                    onClick={() => setLocationFilter('local')}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-sm transition-colors rounded-full text-center",
                      locationFilter === 'local' 
                        ? "bg-muted text-foreground font-medium" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Local
                  </button>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="mb-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">View</h3>
                <div className="inline-flex items-center gap-1 border rounded-full p-1">
                  <button
                    onClick={() => setViewMode('products')}
                    className={cn(
                      "px-3 py-1.5 text-xs transition-colors rounded-full text-center whitespace-nowrap",
                      viewMode === 'products' 
                        ? "bg-muted text-foreground font-medium" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Products
                  </button>
                  <button
                    onClick={() => setViewMode('vendors')}
                    className={cn(
                      "px-3 py-1.5 text-xs transition-colors rounded-full text-center whitespace-nowrap",
                      viewMode === 'vendors' 
                        ? "bg-muted text-foreground font-medium" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Vendors
                  </button>
                  <button
                    onClick={() => setViewMode('markets')}
                    className={cn(
                      "px-3 py-1.5 text-xs transition-colors rounded-full text-center whitespace-nowrap",
                      viewMode === 'markets' 
                        ? "bg-muted text-foreground font-medium" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Markets
                  </button>
                </div>
              </div>

              {/* Days / Times */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Times</h3>
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayShort) => {
                    const dayMapping: Record<string, string> = {
                      'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
                      'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
                    };
                    const fullDayName = dayMapping[dayShort];
                    const isActive = selectedDays.includes(fullDayName);
                    const isViewing = selectedTimeDay === fullDayName;
                    
                    return (
                      <button
                        key={dayShort}
                        onClick={() => {
                          if (isActive) {
                            setSelectedDays(prev => prev.filter(d => d !== fullDayName));
                            setDayTimeRanges(prev => {
                              const next = { ...prev };
                              delete next[fullDayName];
                              return next;
                            });
                            setSelectedTimeDay(isViewing ? '' : selectedTimeDay);
                          } else {
                            setSelectedDays(prev => [...prev, fullDayName]);
                            setSelectedTimeDay(fullDayName);
                          }
                        }}
                        className={cn(
                          "px-2 py-2 rounded-lg text-xs font-medium transition-colors border",
                          isActive
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        )}
                      >
                        {dayShort}
                      </button>
                    );
                  })}
                </div>

                {/* Per-day Time Range */}
                {selectedTimeDay && selectedDays.includes(selectedTimeDay) && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium">{selectedTimeDay}</span>
                    {(() => {
                      const tr = getTimeRange(selectedTimeDay);
                      const timeOptions = ['12:00', '12:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30', '4:00', '4:30', '5:00', '5:30', '6:00', '6:30', '7:00', '7:30', '8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30'];
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <Select value={tr.startHour} onValueChange={(v) => updateDayTimeRange(selectedTimeDay, { startHour: v })}>
                              <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-background">
                                {timeOptions.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={tr.startPeriod} onValueChange={(v) => updateDayTimeRange(selectedTimeDay, { startPeriod: v })}>
                              <SelectTrigger className="w-[60px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-background">
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <span className="text-xs text-muted-foreground">to</span>
                          <div className="flex items-center gap-2">
                            <Select value={tr.endHour} onValueChange={(v) => updateDayTimeRange(selectedTimeDay, { endHour: v })}>
                              <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-background">
                                {timeOptions.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={tr.endPeriod} onValueChange={(v) => updateDayTimeRange(selectedTimeDay, { endPeriod: v })}>
                              <SelectTrigger className="w-[60px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-background">
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Reset */}
              <button
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedDays([]);
                  setLocationFilter('all');
                  setViewMode('products');
                  setSelectedTimeDay('');
                  setDayTimeRanges({});
                }}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mt-4 pt-4 border-t w-full"
              >
                <RotateCcw className="h-3 w-3" />
                Reset all filters
              </button>
            </div>
          );

          return (
            <>
              {/* Top panel on small screens */}
              <div className="block md:hidden mb-6">
                {filterContent}
              </div>
              {/* Sidebar on md+ screens - rendered inside the flex below */}
              <div ref={filterPanelRef} className="hidden md:block w-64 flex-shrink-0 space-y-6 absolute" data-filter-sidebar>
                {filterContent}
              </div>
            </>
          );
        })()}

          {/* Results Area */}
          <div className="flex-1 min-w-0">
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
          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-6", showFilters ? "lg:grid-cols-3 2xl:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-4")}>
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
        </div>
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
