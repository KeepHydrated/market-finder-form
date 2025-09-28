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
import { calculateDistance, getGoogleMapsDistance, cacheVendorCoordinates } from "@/lib/geocoding";

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

  // Handle URL parameters
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    
    if (categoryParam && !selectedCategories.includes(categoryParam)) {
      setSelectedCategories([categoryParam]);
    }
    
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  // Filter submissions based on search query and other filters
  useEffect(() => {
    let filtered = acceptedSubmissions;
    
    // When filtering by category (from header dropdown), show ALL nationwide vendors
    const categoryParam = searchParams.get('category');
    const isNationwideSearch = !!categoryParam;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(submission => 
        submission.store_name.toLowerCase().includes(query) ||
        submission.primary_specialty.toLowerCase().includes(query) ||
        submission.description.toLowerCase().includes(query) ||
        submission.products.some((product: any) => 
          product.name?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query)
        )
      );
    }

    // Apply category filter - show ALL nationwide vendors for selected category
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(submission =>
        selectedCategories.includes(submission.primary_specialty)
      );
      
      // If this is from the header dropdown, switch to products view and show nationwide results
      if (isNationwideSearch) {
        console.log(`🌍 Showing nationwide results for category: ${selectedCategories.join(', ')}`);
        console.log(`Found ${filtered.length} vendors nationwide in this category`);
        setViewMode('products'); // Automatically switch to products view for category searches
      }
    }

    // Apply other existing filters here if needed (days, location, etc.)
    // Note: When showing nationwide category results, we skip location-based filtering
    

    // Apply day filter
    if (selectedDays.length > 0) {
      filtered = filtered.filter(submission => {
        if (!submission.market_days) return false;
        return submission.market_days.some(day => selectedDays.includes(day));
      });
    }

    // Apply location filter if user coordinates are available and it's not a nationwide search
    if (userCoordinates && !isNationwideSearch) {
      filtered = filtered.filter(submission => {
        if (!submission.market_address) return true; // Include if no address to filter by
        
        try {
          const distance = calculateDistance(
            userCoordinates.lat,
            userCoordinates.lng,
            submission.market_address
          );
          return distance <= rangeMiles[0];
        } catch (error) {
          console.warn('Error calculating distance for submission:', submission.id, error);
          return true; // Include in results if distance calculation fails
        }
      });
    }

    setFilteredSubmissions(filtered);
    console.log('Filtered submissions:', filtered.length, 'out of', acceptedSubmissions.length);
  }, [acceptedSubmissions, searchQuery, selectedCategories, selectedDays, userCoordinates, rangeMiles, searchParams]);

  // Load accepted submissions
  useEffect(() => {
    fetchAcceptedSubmissions();
  }, []);

  // Load vendor ratings
  useEffect(() => {
    if (acceptedSubmissions.length > 0) {
      fetchVendorRatings();
    }
  }, [acceptedSubmissions]);

  const fetchAcceptedSubmissions = async () => {
    try {
      console.log('Fetching accepted submissions...');
      const { data, error } = await supabase
        .from('accepted_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching accepted submissions:', error);
        toast({
          title: "Error",
          description: "Failed to load vendors. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched submissions:', data?.length || 0);
      setAcceptedSubmissions(data || []);
    } catch (error) {
      console.error('Error in fetchAcceptedSubmissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_reviews')
        .select('vendor_id, rating');

      if (error) {
        console.error('Error fetching vendor ratings:', error);
        return;
      }

      // Calculate average ratings
      const ratingsMap: Record<string, VendorRating> = {};
      data?.forEach(review => {
        if (!ratingsMap[review.vendor_id]) {
          ratingsMap[review.vendor_id] = {
            vendorId: review.vendor_id,
            averageRating: 0,
            totalReviews: 0
          };
        }
        ratingsMap[review.vendor_id].totalReviews += 1;
        ratingsMap[review.vendor_id].averageRating = 
          ((ratingsMap[review.vendor_id].averageRating * (ratingsMap[review.vendor_id].totalReviews - 1)) + review.rating) / 
          ratingsMap[review.vendor_id].totalReviews;
      });

      setVendorRatings(ratingsMap);
    } catch (error) {
      console.error('Error in fetchVendorRatings:', error);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearAllFilters = () => {
    setSelectedDays([]);
    setSelectedCategories([]);
    setSearchQuery("");
    setLocationZipcode("");
    setUserCoordinates(null);
    setRangeMiles([25]);
    // Clear URL parameters
    navigate('/homepage');
  };

  const getUserLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingGPSLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoordinates({ lat: latitude, lng: longitude });
        setLocationMethod('gps');
        
        // Get address from coordinates for display
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const zipcode = data.address?.postcode || '';
          setLocationZipcode(zipcode);
        } catch (error) {
          console.error('Error getting address from coordinates:', error);
        }
        
        setIsGettingGPSLocation(false);
        toast({
          title: "Location updated",
          description: "Using your current GPS location",
        });
      },
      (error) => {
        setIsGettingGPSLocation(false);
        console.error('Error getting location:', error);
        toast({
          title: "Location error",
          description: "Could not get your location. Please enter your zip code manually.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
    );
  };

  const handleLocationSubmit = async () => {
    if (!locationZipcode.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid zip code",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingLocation(true);
    setLocationMethod('ip');

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${locationZipcode}&countrycodes=us&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setUserCoordinates({ lat: parseFloat(lat), lng: parseFloat(lon) });
        toast({
          title: "Location updated",
          description: `Searching near ${locationZipcode}`,
        });
      } else {
        toast({
          title: "Location not found",
          description: "Could not find the specified zip code",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error geocoding zip code:', error);
      toast({
        title: "Error",
        description: "Failed to find location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Get unique markets
  const getUniqueMarkets = () => {
    const marketsMap = new Map();
    
    filteredSubmissions.forEach(submission => {
      if (submission.market_address && submission.selected_market) {
        const key = `${submission.selected_market}-${submission.market_address}`;
        if (!marketsMap.has(key)) {
          marketsMap.set(key, {
            name: submission.selected_market,
            address: submission.market_address,
            vendors: []
          });
        }
        marketsMap.get(key).vendors.push(submission);
      }
    });

    return Array.from(marketsMap.values());
  };

  const handleMarketClick = (market: any) => {
    setSelectedMarket(market);
    setViewMode('vendors');
  };

  // Get all products from filtered vendors
  const getAllProducts = () => {
    const allProducts: any[] = [];
    
    filteredSubmissions.forEach(submission => {
      if (submission.products && submission.products.length > 0) {
        submission.products.forEach((product: any) => {
          allProducts.push({
            ...product,
            vendorName: submission.store_name,
            vendorId: submission.id,
            vendorSpecialty: submission.primary_specialty
          });
        });
      }
    });

    return allProducts;
  };

  // Calculate and cache distances for markets
  useEffect(() => {
    if (!userCoordinates || viewMode !== 'markets' || isLoadingMarketDistances) return;
    
    const calculateMarketDistances = async () => {
      setIsLoadingMarketDistances(true);
      const uniqueMarkets = getUniqueMarkets();
      const distances: Record<string, string> = {};
      
      for (const market of uniqueMarkets) {
        try {
          const distance = await getGoogleMapsDistance(userCoordinates, market.address);
          distances[`${market.name}-${market.address}`] = distance;
        } catch (error) {
          console.error(`Error calculating distance to ${market.name}:`, error);
          distances[`${market.name}-${market.address}`] = 'Distance unavailable';
        }
      }
      
      setMarketDistances(distances);
      setIsLoadingMarketDistances(false);
    };

    calculateMarketDistances();
  }, [userCoordinates, viewMode, filteredSubmissions]);

  // Calculate and cache distances for vendors
  useEffect(() => {
    if (!userCoordinates || (viewMode !== 'vendors' && !selectedMarket)) return;
    
    const calculateVendorDistances = async () => {
      const vendorsToCalculate = selectedMarket ? selectedMarket.vendors : filteredSubmissions;
      const distances: Record<string, string> = {};
      
      for (const vendor of vendorsToCalculate) {
        if (vendor.market_address) {
          try {
            const distance = await getGoogleMapsDistance(userCoordinates, vendor.market_address);
            distances[vendor.id] = distance;
          } catch (error) {
            console.error(`Error calculating distance to ${vendor.store_name}:`, error);
            distances[vendor.id] = 'Distance unavailable';
          }
        }
      }
      
      setVendorDistances(distances);
    };

    calculateVendorDistances();
  }, [userCoordinates, viewMode, selectedMarket, filteredSubmissions]);

  const formatMarketHours = (hours: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }> | undefined) => {
    if (!hours) return 'Hours not available';
    
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayAbbrev: Record<string, string> = {
      'monday': 'Mon',
      'tuesday': 'Tue', 
      'wednesday': 'Wed',
      'thursday': 'Thu',
      'friday': 'Fri',
      'saturday': 'Sat',
      'sunday': 'Sun'
    };

    const hoursArray = daysOrder
      .filter(day => hours[day])
      .map(day => {
        const dayHours = hours[day];
        return `${dayAbbrev[day]} ${dayHours.start}${dayHours.startPeriod}-${dayHours.end}${dayHours.endPeriod}`;
      });

    return hoursArray.join(', ') || 'Hours not available';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        
        {/* Only show view toggle and filter when no category is selected */}
        {!searchParams.get('category') && (
          <div className="flex justify-between items-center mb-6">
            <div className="flex rounded-lg bg-muted p-1">
              <button
                onClick={() => {
                  setViewMode('vendors');
                  setSelectedMarket(null);
                }}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  viewMode === 'vendors' && !selectedMarket
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Vendors
              </button>
              <button
                onClick={() => {
                  setViewMode('markets');
                  setSelectedMarket(null);
                }}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  viewMode === 'markets'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Markets
              </button>
              <button
                onClick={() => {
                  setViewMode('products');
                  setSelectedMarket(null);
                }}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  viewMode === 'products'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Products
              </button>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter search results
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[800px] max-w-none p-0 bg-background border shadow-lg">
                <Tabs defaultValue="times" className="w-full">
                  <div className="pt-8 px-8">
                    <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
                      <TabsTrigger value="times">Times</TabsTrigger>
                      <TabsTrigger value="categories">Categories</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="times" className="px-8 pb-8 pt-8">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map((day) => (
                          <Button
                            key={day}
                            type="button"
                            variant={selectedDays.includes(day) ? "default" : "outline"}
                            onClick={() => toggleDay(day)}
                            className={cn(
                              "h-12 flex-1 min-w-[70px]",
                              selectedDays.includes(day) && "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium mb-4">Location</h3>
                          <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter zip code"
                                value={locationZipcode}
                                onChange={(e) => setLocationZipcode(e.target.value)}
                                className="flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleLocationSubmit();
                                  }
                                }}
                              />
                              <Button 
                                onClick={handleLocationSubmit}
                                disabled={isLoadingLocation}
                                className="whitespace-nowrap"
                              >
                                {isLoadingLocation ? "Loading..." : "Set Location"}
                              </Button>
                            </div>
                            <div className="flex justify-center">
                              <Button
                                variant="outline"
                                onClick={getUserLocation}
                                disabled={isGettingGPSLocation}
                                className="flex items-center gap-2"
                              >
                                <MapPin className="h-4 w-4" />
                                {isGettingGPSLocation ? "Getting location..." : "Use Current Location"}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {userCoordinates && (
                          <div>
                            <h3 className="text-lg font-medium mb-4">Distance Range</h3>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Within {rangeMiles[0]} miles</span>
                                <span className="text-muted-foreground">
                                  {locationMethod === 'gps' ? 'GPS Location' : locationZipcode}
                                </span>
                              </div>
                              <Slider
                                value={rangeMiles}
                                onValueChange={setRangeMiles}
                                max={100}
                                min={1}
                                step={1}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>1 mile</span>
                                <span>100 miles</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={clearAllFilters}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Clear All
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="categories" className="px-8 pb-8 pt-8">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {SPECIALTY_CATEGORIES.map((category) => (
                          <Button
                            key={category}
                            type="button"
                            variant={selectedCategories.includes(category) ? "default" : "outline"}
                            onClick={() => toggleCategory(category)}
                            className={cn(
                              "h-auto py-3 px-4 text-sm",
                              selectedCategories.includes(category) && "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        {/* Content based on view mode */}
        {viewMode === 'vendors' ? (
          <div className="flex justify-center">
            {/* Show selected market header if a market is selected */}
            {selectedMarket && (
              <div className="w-full mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedMarket.name}</h2>
                    <p className="text-muted-foreground text-sm">{selectedMarket.address}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedMarket(null)}
                  >
                    Back to All Vendors
                  </Button>
                </div>
              </div>
            )}
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl">
              {(() => {
                const vendorsToShow = selectedMarket ? selectedMarket.vendors : filteredSubmissions;
                
                if (vendorsToShow.length === 0) {
                  return (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">No vendors found matching your criteria.</p>
                    </div>
                  );
                }

                return vendorsToShow.map((submission) => {
                  const rating = vendorRatings[submission.id];
                  const distance = vendorDistances[submission.id];
                  
                  return (
                    <Card key={submission.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{submission.store_name}</h3>
                            <Badge variant="secondary" className="mb-2">
                              {submission.primary_specialty}
                            </Badge>
                          </div>
                          {distance && (
                            <div className="text-xs text-muted-foreground">
                              {distance}
                            </div>
                          )}
                        </div>

                        {rating && (
                          <div className="flex items-center gap-1 mb-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "h-4 w-4",
                                    star <= rating.averageRating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "fill-muted text-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              ({rating.totalReviews})
                            </span>
                          </div>
                        )}

                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          {submission.description}
                        </p>

                        <div className="space-y-2">
                          <div>
                            <p className="font-medium text-sm">{submission.selected_market}</p>
                            <p className="text-xs text-muted-foreground">{submission.market_address}</p>
                          </div>
                          
                          {submission.market_days && submission.market_days.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {submission.market_days.map((day, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {day}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            {formatMarketHours(submission.market_hours)}
                          </div>
                        </div>

                        <Button 
                          className="w-full mt-4"
                          onClick={() => navigate(`/vendor/${submission.id}`)}
                        >
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          </div>
        ) : viewMode === 'markets' ? (
          <div className="flex justify-center">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl">
              {(() => {
                const uniqueMarkets = getUniqueMarkets();
                
                if (uniqueMarkets.length === 0) {
                  return (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">No markets found matching your criteria.</p>
                    </div>
                  );
                }

                return uniqueMarkets.map((market) => {
                  const marketKey = `${market.name}-${market.address}`;
                  const distance = marketDistances[marketKey];
                  
                  return (
                    <Card 
                      key={marketKey} 
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleMarketClick(market)}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{market.name}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{market.address}</p>
                          </div>
                          {distance && (
                            <div className="text-xs text-muted-foreground">
                              {distance}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {market.vendors.length} vendor{market.vendors.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          
                          <div className="text-sm">
                            <p className="font-medium mb-1">Vendor Categories:</p>
                            <div className="flex flex-wrap gap-1">
                              {[...new Set(market.vendors.map(v => v.primary_specialty))].slice(0, 3).map((specialty) => (
                                <Badge key={specialty} variant="outline" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                              {[...new Set(market.vendors.map(v => v.primary_specialty))].length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{[...new Set(market.vendors.map(v => v.primary_specialty))].length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button className="w-full mt-4">
                          View Market Vendors
                        </Button>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full max-w-7xl">
              {(() => {
                const allProducts = getAllProducts();
                
                if (allProducts.length === 0) {
                  return (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">No products available yet.</p>
                    </div>
                  );
                }

                return allProducts.map((product, index) => (
                  <Card key={`${product.vendorId}-${index}`} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      {product.image && (
                        <img 
                          src={product.image} 
                          alt={product.name || 'Product'} 
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike('product', `${product.vendorId}-${index}`);
                        }}
                        className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
                      >
                        <Heart 
                          className={cn(
                            "h-4 w-4",
                            isLiked('product', `${product.vendorId}-${index}`)
                              ? "fill-red-500 text-red-500" 
                              : "text-gray-600"
                          )}
                        />
                      </button>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm mb-1 line-clamp-2">
                        {product.name || 'Unnamed Product'}
                      </h3>
                      <p className="text-muted-foreground text-xs mb-2 line-clamp-2">
                        {product.description || 'No description available'}
                      </p>
                      {product.price && (
                        <p className="text-muted text-sm font-medium mb-2">
                          ${product.price}
                        </p>
                      )}
                      <div className="border-t border-muted pt-2 mt-2">
                        <p className="text-xs text-muted-foreground">
                          {product.vendorName}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Homepage;
