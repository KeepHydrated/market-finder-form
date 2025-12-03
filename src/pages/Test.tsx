import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Heart, Star, Filter, RotateCcw, MapPin, Search, ChevronDown, Store, Package, ChevronLeft, ChevronRight, X, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLikes } from "@/hooks/useLikes";
import { calculateDistance, getGoogleMapsDistance, getCoordinatesForAddress } from "@/lib/geocoding";
import { ProductDetailModal } from "@/components/ProductDetailModal";

interface AcceptedSubmission {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any[];
  selected_market: string;
  selected_markets?: any; // Json type from database, can be array of objects or strings
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { toggleLike, isLiked, likes } = useLikes();
  const [acceptedSubmissions, setAcceptedSubmissions] = useState<AcceptedSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<AcceptedSubmission[]>([]);
  const [vendorRatings, setVendorRatings] = useState<Record<string, VendorRating>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || searchParams.get('q') || "");
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
  const [viewMode, setViewMode] = useState<'markets' | 'vendors' | 'products'>('products');
  const [selectedMarket, setSelectedMarket] = useState<{
    name: string;
    address: string;
    vendors: AcceptedSubmission[];
  } | null>(null);
  
  const [marketDistances, setMarketDistances] = useState<Record<string, string>>({});
  const [isLoadingMarketDistances, setIsLoadingMarketDistances] = useState(false);
  const [locationMethod, setLocationMethod] = useState<'ip' | 'gps'>('ip');
  const [isGettingGPSLocation, setIsGettingGPSLocation] = useState(false);
  const [marketGoogleRatings, setMarketGoogleRatings] = useState<Record<string, {rating: number; reviewCount: number}>>({});
  const [vendorDistances, setVendorDistances] = useState<Record<string, string>>({});
  const [isLoadingVendorDistances, setIsLoadingVendorDistances] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentVendorProducts, setCurrentVendorProducts] = useState<any[]>([]);
  const [currentVendorId, setCurrentVendorId] = useState<string | undefined>(undefined);
  const [currentVendorName, setCurrentVendorName] = useState<string | undefined>(undefined);
  const [marketAddressesMap, setMarketAddressesMap] = useState<Record<string, string>>({});
  const [marketDaysMap, setMarketDaysMap] = useState<Record<string, string[]>>({});
  const [loadingMarketDays, setLoadingMarketDays] = useState(false);
  const [vendorMarketIndices, setVendorMarketIndices] = useState<Record<string, number>>({});
  const [searchScope, setSearchScope] = useState<'local' | 'nationwide'>('nationwide');
  const [sortBy, setSortBy] = useState<'relevancy' | 'lowest-price' | 'highest-price' | 'top-rated' | 'most-recent'>('relevancy');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Sync search query with URL parameter
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  // Handle category selection from URL - keep it on test page
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    
    if (categoryParam) {
      // Stay on test page, just update the selected categories
      setSelectedCategories([categoryParam]);
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
        submission.search_term?.toLowerCase().includes(query) ||
        submission.selected_market?.toLowerCase().includes(query) ||
        submission.market_address?.toLowerCase().includes(query) ||
        submission.products.some((product: any) => 
          product.name?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query)
        )
      );
    }

    // Apply category filter - show ALL nationwide vendors for selected category
    // Skip filtering if "All" is selected
    if (selectedCategories.length > 0 && !selectedCategories.includes('All')) {
      filtered = filtered.filter(submission =>
        selectedCategories.includes(submission.primary_specialty)
      );
      
      // If this is from the header dropdown, switch to products view and show nationwide results
      if (isNationwideSearch) {
        console.log(`🌍 Showing nationwide results for category: ${selectedCategories.join(', ')}`);
        console.log(`Found ${filtered.length} vendors nationwide in this category`);
        setViewMode('products'); // Automatically switch to products view for category searches
      }
    } else if (selectedCategories.includes('All')) {
      // When "All" is selected, show everything (no category filter)
      if (isNationwideSearch) {
        console.log(`🌍 Showing nationwide results for category: All`);
        console.log(`Found ${filtered.length} vendors nationwide in this category`);
        setViewMode('products');
      }
    }

    // Apply location-based filtering only if in "local" mode
    if (searchScope === 'local' && userCoordinates) {
      // Filter by location radius
      filtered = filtered.filter(submission => {
        if (submission.latitude && submission.longitude) {
          const distance = calculateDistance(
            userCoordinates.lat,
            userCoordinates.lng,
            submission.latitude,
            submission.longitude
          );
          return distance <= rangeMiles[0];
        }
        return false;
      });
    }

    // Apply other existing filters here if needed (days, etc.)
    
    // Apply sorting with liked items prioritization
    filtered = [...filtered].sort((a, b) => {
      // First priority: liked vendors (boost them to the top)
      const aIsLiked = isLiked(a.id, 'vendor');
      const bIsLiked = isLiked(b.id, 'vendor');
      
      if (aIsLiked && !bIsLiked) return -1;
      if (!aIsLiked && bIsLiked) return 1;
      
      // Then apply normal sorting within liked/unliked groups
      switch (sortBy) {
        case 'lowest-price':
          // Sort by lowest product price
          const aMinPrice = Math.min(...(a.products || []).map((p: any) => p.price || Infinity));
          const bMinPrice = Math.min(...(b.products || []).map((p: any) => p.price || Infinity));
          return aMinPrice - bMinPrice;
        
        case 'highest-price':
          // Sort by highest product price
          const aMaxPrice = Math.max(...(a.products || []).map((p: any) => p.price || 0));
          const bMaxPrice = Math.max(...(b.products || []).map((p: any) => p.price || 0));
          return bMaxPrice - aMaxPrice;
        
        case 'top-rated':
          // Sort by rating (highest first)
          const aRating = a.google_rating || 0;
          const bRating = b.google_rating || 0;
          return bRating - aRating;
        
        case 'most-recent':
          // Sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        
        case 'relevancy':
        default:
          // Default sorting (relevancy based on search query)
          if (searchQuery.trim()) {
            const getRelevanceScore = (sub: AcceptedSubmission) => {
              const query = searchQuery.toLowerCase();
              let score = 0;
              if (sub.store_name.toLowerCase().includes(query)) score += 10;
              if (sub.primary_specialty.toLowerCase().includes(query)) score += 5;
              if (sub.description.toLowerCase().includes(query)) score += 3;
              return score;
            };
            return getRelevanceScore(b) - getRelevanceScore(a);
          }
          return 0;
      }
    });
    
    setFilteredSubmissions(filtered);
  }, [acceptedSubmissions, searchQuery, selectedCategories, searchParams, searchScope, userCoordinates, rangeMiles, sortBy]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => {
      const newSelected = prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day];
      
      // Initialize time selection for newly selected day (all day)
      if (!prev.includes(day)) {
        setDayTimeSelections(prevTimes => ({
          ...prevTimes,
          [day]: {
            startTime: '12:00',
            startPeriod: 'AM',
            endTime: '11:30',
            endPeriod: 'PM'
          }
        }));
      }
      
      return newSelected;
    });
  };

  const updateTimeSelection = (day: string, field: string, value: string) => {
    setDayTimeSelections(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      return prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category];
    });
  };

  const timeOptions = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    return [`${hour.toString().padStart(2, '0')}:00`, `${hour.toString().padStart(2, '0')}:30`];
  }).flat();

  // Get current location and convert to zipcode (same as /profile page)
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingLocation(true);
    setIsGettingGPSLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Store user coordinates for distance calculations
          setUserCoordinates({ lat: latitude, lng: longitude });
          setLocationMethod('gps');
          
          // Use a free reverse geocoding API to get actual zipcode
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (!response.ok) {
            throw new Error('Failed to fetch location data');
          }
          
          const data = await response.json();
          const zipcode = data.postcode || data.postalCode || 'Unknown';
          
          if (zipcode === 'Unknown') {
            throw new Error('Could not determine zipcode');
          }
          
          setLocationZipcode(zipcode);
          
          toast({
            title: "GPS Location found",
            description: `Using precise GPS location. Zipcode: ${zipcode}`,
          });
        } catch (error) {
          console.error('Geocoding error:', error);
          toast({
            title: "Error",
            description: "Failed to get zipcode from your GPS location. Please enter it manually.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingLocation(false);
          setIsGettingGPSLocation(false);
        }
      },
      (error) => {
        setIsLoadingLocation(false);
        setIsGettingGPSLocation(false);
        let errorMessage = "Please allow location access to get your zipcode.";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location services and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Please enter your zipcode manually.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again or enter manually.";
            break;
        }
        
        toast({
          title: "GPS Location Error",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };


  // Enhanced local storage cache for distances
  const DISTANCE_CACHE_KEY = 'market_distance_cache';
  const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

  // Fetch Google ratings for markets with database persistence
  const fetchMarketGoogleRatings = async (markets: Array<{name: string, address: string, vendors: AcceptedSubmission[]}>) => {
    console.log('=== FETCHING MARKET GOOGLE RATINGS WITH DATABASE PERSISTENCE ===');
    const ratings: Record<string, {rating: number; reviewCount: number}> = {};
    
    for (const market of markets) {
      const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
      
      try {
        console.log(`🔍 Checking database for cached rating: ${market.name}`);
        
        // First, check if we have cached ratings in the database (using maybeSingle to avoid errors)
        const { data: existingMarket, error: dbError } = await supabase
          .from('markets')
          .select('google_rating, google_rating_count, last_rating_update')
          .eq('name', market.name)
          .eq('address', market.address)
          .maybeSingle();

        if (dbError) {
          console.error(`❌ Database error for ${market.name}:`, dbError);
        } else {
          console.log(`📊 Database result for ${market.name}:`, existingMarket);
        }

        // Check if we have recent ratings (less than 24 hours old)
        const isRecentRating = existingMarket?.last_rating_update && 
          new Date(existingMarket.last_rating_update).getTime() > Date.now() - (24 * 60 * 60 * 1000);

        if (existingMarket?.google_rating && existingMarket?.google_rating_count && isRecentRating) {
          // Use cached ratings
          ratings[marketId] = {
            rating: existingMarket.google_rating,
            reviewCount: existingMarket.google_rating_count
          };
          console.log(`✅ Using cached rating for ${market.name}:`, ratings[marketId]);
        } else {
          // Fetch fresh ratings from Google Places API
          console.log(`🔄 Fetching fresh Google rating for market: ${market.name}`);
          
          const response = await supabase.functions.invoke('farmers-market-search', {
            body: { 
              query: market.name,
              location: null
            }
          });

          console.log(`📡 API response for ${market.name}:`, response);

          if (response.data?.predictions && response.data.predictions.length > 0) {
            const marketData = response.data.predictions[0];
            console.log(`📍 Market data for ${market.name}:`, marketData);
            
            if (marketData.rating && marketData.user_ratings_total) {
              ratings[marketId] = {
                rating: marketData.rating,
                reviewCount: marketData.user_ratings_total
              };
              console.log(`✅ Found fresh Google rating for ${market.name}:`, ratings[marketId]);

              // Store/update the rating in the database using the ACTUAL Google Maps address
              const { error: insertError } = await supabase
                .from('markets')
                .insert({
                  name: market.name,
                  address: marketData.address, // Use Google Maps address, not vendor submission address
                  city: 'San Antonio', // Default city
                  state: 'TX', // Default state
                  days: ['Sunday'], // Default days
                  google_rating: marketData.rating,
                  google_rating_count: marketData.user_ratings_total,
                  google_place_id: marketData.place_id,
                  last_rating_update: new Date().toISOString()
                });

              if (insertError) {
                console.error(`❌ Error storing rating for ${market.name}:`, insertError);
                
                // Try updating existing record if insert failed
                // Use place_id as the primary identifier to avoid updating multiple records
                const { error: updateError } = await supabase
                  .from('markets')
                  .update({
                    address: marketData.address, // Update with correct Google Maps address
                    google_rating: marketData.rating,
                    google_rating_count: marketData.user_ratings_total,
                    last_rating_update: new Date().toISOString()
                  })
                  .eq('google_place_id', marketData.place_id);

                if (updateError) {
                  console.error(`❌ Error updating rating for ${market.name}:`, updateError);
                } else {
                  console.log(`💾 Updated rating and address for ${market.name} in database`);
                  // Update the address map immediately
                  setMarketAddressesMap(prev => ({
                    ...prev,
                    [market.name]: marketData.address
                  }));
                }
              } else {
                console.log(`💾 Stored rating and address for ${market.name} in database`);
                // Update the address map immediately
                setMarketAddressesMap(prev => ({
                  ...prev,
                  [market.name]: marketData.address
                }));
              }
            } else {
              console.log(`⚠️ No rating data in API response for ${market.name}`);
            }
          } else {
            console.log(`⚠️ No predictions in API response for ${market.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing rating for market ${market.name}:`, error);
      }
    }
    
    console.log('🎯 Final market ratings:', ratings);
    setMarketGoogleRatings(ratings);
    console.log('=== END MARKET GOOGLE RATINGS FETCH ===');
  };
  
  // Load cached distances from localStorage
  const loadCachedDistances = () => {
    try {
      const cached = localStorage.getItem(DISTANCE_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
        if (!isExpired) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Error loading cached distances:', error);
    }
    return {};
  };
  
  // Save distances to localStorage
  const saveCachedDistances = (distances: Record<string, string>) => {
    try {
      const cacheData = {
        data: distances,
        timestamp: Date.now()
      };
      localStorage.setItem(DISTANCE_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error saving cached distances:', error);
    }
  };

  // Calculate distances for all markets (super optimized with multiple caching layers)
  const calculateMarketDistances = async (markets: Array<{name: string, address: string, vendors: AcceptedSubmission[]}>, userCoords: {lat: number, lng: number}) => {
    console.log('=== SUPER OPTIMIZED MARKET DISTANCE CALCULATION ===');
    console.log('User coordinates:', userCoords);
    console.log('Starting super optimized distance calculations for', markets.length, 'markets');
    
    setIsLoadingMarketDistances(true);
    
    // TEMPORARILY CLEAR CACHE to ensure fresh Google Maps calculations
    console.log('🔄 Clearing distance cache to force fresh Google Maps calculations');
    localStorage.removeItem(DISTANCE_CACHE_KEY);
    
    // Layer 1: Load cached distances from localStorage (will be empty now)
    const cachedDistances = loadCachedDistances();
    
    // Layer 2: Use ONLY cached market distances (no vendor fallbacks for consistency)
    const quickDistances: Record<string, string> = {};
    
    markets.forEach(market => {
      const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
      
      // Only use cached market distances - no vendor fallbacks to ensure consistency
      if (cachedDistances[marketId]) {
        quickDistances[marketId] = cachedDistances[marketId];
        console.log(`📍 Using cached market distance for ${market.name}: ${cachedDistances[marketId]}`);
      } else {
        console.log(`⚠️ No cached distance for ${market.name}, will calculate fresh from Google Maps`);
      }
    });
    
    // Set all available distances immediately for instant display
    if (Object.keys(quickDistances).length > 0) {
      console.log('Setting instant distances:', Object.keys(quickDistances).length, 'markets');
      setMarketDistances(prev => ({ ...prev, ...quickDistances }));
    }
    
    // Layer 3: Calculate remaining distances in optimized batches
    const marketsNeedingCalculation = markets.filter(market => {
      const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
      return !quickDistances[marketId]; // Only calculate if not already available
    });
    
    if (marketsNeedingCalculation.length === 0) {
      console.log('All market distances available from cache/vendors!');
      setIsLoadingMarketDistances(false);
      return;
    }
    
    console.log(`Need to calculate distances for ${marketsNeedingCalculation.length} markets`);
    
    // Process in smaller batches to prevent API rate limits and improve perceived performance
    const BATCH_SIZE = 3; // Process 3 markets at a time
    const batches = [];
    
    for (let i = 0; i < marketsNeedingCalculation.length; i += BATCH_SIZE) {
      batches.push(marketsNeedingCalculation.slice(i, i + BATCH_SIZE));
    }
    
    // Process batches sequentially but markets within each batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} markets`);
      
      try {
        const batchPromises = batch.map(async (market) => {
          const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
          
          try {
            // Use market address directly for consistent coordinates
            const marketCoords = await getCoordinatesForAddress(market.address);
            
            if (marketCoords) {
               // Calculate distance using Google Maps
               const googleDistance = await getGoogleMapsDistance(
                 userCoords.lat, 
                 userCoords.lng, 
                 marketCoords.lat, 
                 marketCoords.lng
               );
               
               console.log(`🗺️ Google Maps API result for ${market.name}:`, {
                 googleDistance,
                 coordinates: { user: userCoords, market: marketCoords }
               });
               
               let finalDistance: string;
               
               if (googleDistance) {
                 finalDistance = googleDistance.distance;
                 console.log(`✅ Using Google Maps distance for ${market.name}: ${finalDistance}`);
               } else {
                 const distanceInMiles = calculateDistance(
                   userCoords.lat, 
                   userCoords.lng, 
                   marketCoords.lat, 
                   marketCoords.lng
                 );
                 finalDistance = `${distanceInMiles.toFixed(1)} mi`;
                 console.log(`⚠️ Fallback to straight-line distance for ${market.name}: ${finalDistance}`);
               }
               
               console.log(`🎯 Final distance set for ${market.name} (${marketId}): ${finalDistance}`);
               
               return { marketId, distance: finalDistance };
            } else {
              return { marketId, distance: '-- mi' };
            }
          } catch (error) {
            console.error(`Error calculating distance for ${market.name}:`, error);
            return { marketId, distance: '-- mi' };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Update distances immediately after each batch
        const newDistances: Record<string, string> = {};
        batchResults.forEach(({ marketId, distance }) => {
          newDistances[marketId] = distance;
        });
        
        // Update state and cache
        setMarketDistances(prev => {
          const updated = { ...prev, ...newDistances };
          // Save to cache for future use
          saveCachedDistances({ ...cachedDistances, ...updated });
          return updated;
        });
        
        console.log(`Batch ${batchIndex + 1} completed:`, newDistances);
        
        // Small delay between batches to be respectful to API limits
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`Error in batch ${batchIndex + 1}:`, error);
      }
    }
    
    setIsLoadingMarketDistances(false);
    console.log('=== END SUPER OPTIMIZED MARKET DISTANCE CALCULATION ===');
  };

  // Calculate distances for all vendors
  const calculateVendorDistances = async (vendors: AcceptedSubmission[], userCoords: {lat: number, lng: number}) => {
    console.log('=== CALCULATING VENDOR DISTANCES ===');
    console.log('User coordinates:', userCoords);
    console.log('Calculating distances for', vendors.length, 'vendors');
    
    setIsLoadingVendorDistances(true);
    
    const newDistances: Record<string, string> = {};
    
    for (const vendor of vendors) {
      try {
        // Use vendor's stored latitude/longitude directly if available
        if (vendor.latitude && vendor.longitude) {
          const vendorCoords = {
            lat: Number(vendor.latitude),
            lng: Number(vendor.longitude)
          };
          
          // Try Google Maps distance first
          const googleDistance = await getGoogleMapsDistance(
            userCoords.lat, 
            userCoords.lng, 
            vendorCoords.lat, 
            vendorCoords.lng
          );
          
          let finalDistance = '-- mi';
          
          if (googleDistance && googleDistance.distanceMiles) {
            finalDistance = `${googleDistance.distanceMiles.toFixed(1)} mi`;
            console.log(`✅ Google Maps distance for ${vendor.store_name}: ${finalDistance}`);
          } else {
            // Fallback to straight-line distance
            const distanceInMiles = calculateDistance(
              userCoords.lat, 
              userCoords.lng, 
              vendorCoords.lat, 
              vendorCoords.lng
            );
            finalDistance = `${distanceInMiles.toFixed(1)} mi`;
            console.log(`⚠️ Fallback distance for ${vendor.store_name}: ${finalDistance}`);
          }
          
          newDistances[vendor.id] = finalDistance;
        } else {
          console.log(`⚠️ No coordinates for ${vendor.store_name}`);
          newDistances[vendor.id] = '-- mi';
        }
      } catch (error) {
        console.error(`Error calculating distance for ${vendor.store_name}:`, error);
        newDistances[vendor.id] = '-- mi';
      }
    }
    
    console.log('🎯 Final vendor distances:', newDistances);
    setVendorDistances(newDistances);
    setIsLoadingVendorDistances(false);
    console.log('=== END VENDOR DISTANCE CALCULATION ===');
  };

  // Group vendors by market - includes ALL markets from selected_markets array
  const groupVendorsByMarket = () => {
    const markets: Record<string, {
      name: string;
      address: string;
      vendors: AcceptedSubmission[];
      days?: string[];
      place_id?: string | null;
    }> = {};

    filteredSubmissions.forEach(submission => {
      // Get the selected_markets array from the submission
      const selectedMarkets = (submission as any).selected_markets || [];
      
      // If no markets in array, fall back to old single market field
      const marketsToProcess = selectedMarkets.length > 0 
        ? selectedMarkets 
        : [submission.selected_market || submission.search_term || 'Unknown Market'];
      
      // Add vendor to each market they're part of
      marketsToProcess.forEach((market: any) => {
        // Handle both string and object formats
        let marketName: string;
        let marketAddress: string;
        let marketDays: string[] = [];
        
        if (typeof market === 'string') {
          marketName = market;
          marketAddress = marketAddressesMap[marketName] || submission.market_address || 'Address not available';
          marketDays = marketDaysMap[marketName] || [];
        } else if (market && typeof market === 'object') {
          // Extract string values from object
          marketName = String(market.name || market.structured_formatting?.main_text || 'Unknown Market');
          marketAddress = String(market.address || market.structured_formatting?.secondary_text || marketAddressesMap[marketName] || submission.market_address || 'Address not available');
          marketDays = marketDaysMap[marketName] || [];
        } else {
          marketName = 'Unknown Market';
          marketAddress = 'Address not available';
          marketDays = [];
        }
        
        const marketKey = marketName;
        
        if (!markets[marketKey]) {
          markets[marketKey] = {
            name: marketName,
            address: marketAddress,
            vendors: [],
            days: marketDays.length > 0 ? marketDays : marketDaysMap[marketName] || [],
            place_id: typeof market === 'object' ? market.place_id : null
          };
        }
        
        markets[marketKey].vendors.push(submission);
      });
    });

    // Aggregate days from all vendors in each market
    Object.values(markets).forEach(market => {
      const allDays = new Set<string>();
      market.vendors.forEach(vendor => {
        if (vendor.market_days && Array.isArray(vendor.market_days)) {
          vendor.market_days.forEach(day => allDays.add(day));
        }
      });
      if (allDays.size > 0) {
        market.days = Array.from(allDays);
      }
    });

    // Convert to array and sort by liked status
    const marketsArray = Object.values(markets);
    
    // Sort markets - liked markets first
    return marketsArray.sort((a, b) => {
      // Create a unique market ID from name and address for checking likes
      const aMarketId = `${a.name}-${a.address}`.replace(/\s+/g, '-').toLowerCase();
      const bMarketId = `${b.name}-${b.address}`.replace(/\s+/g, '-').toLowerCase();
      
      const aIsLiked = isLiked(aMarketId, 'market');
      const bIsLiked = isLiked(bMarketId, 'market');
      
      if (aIsLiked && !bIsLiked) return -1;
      if (!aIsLiked && bIsLiked) return 1;
      return 0;
    });
  };

  // Fetch all market addresses from the database
  const fetchMarketAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('name, address, days');
      
      if (error) {
        console.error('Error fetching market addresses:', error);
        return;
      }
      
      if (data) {
        const addressMap: Record<string, string> = {};
        const daysMap: Record<string, string[]> = {};
        data.forEach(market => {
          addressMap[market.name] = market.address;
          daysMap[market.name] = market.days || [];
        });
        setMarketAddressesMap(addressMap);
        setMarketDaysMap(daysMap);
        console.log('📍 Loaded market data from database:', { addressMap, daysMap });
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  // Fetch Google Places details to get opening hours via edge function
  const fetchPlaceDetails = async (placeId: string): Promise<string[]> => {
    console.log('🔍 [v3.0] Fetching place details for place_id:', placeId);
    try {
      // Use the farmers-market-search edge function with place_id
      const { data, error } = await supabase.functions.invoke('farmers-market-search', {
        body: { place_id: placeId }
      });

      console.log('📦 [v3.0] Edge function response:', { data, error });
      
      if (error) {
        console.error('❌ [v3.0] Edge function error:', error);
        return [];
      }

      // The edge function returns the result directly, not wrapped
      if (data?.opening_hours?.weekday_text) {
        const days = extractDaysFromWeekdayText(data.opening_hours.weekday_text);
        console.log('✅ [v3.0] Extracted days from place details:', days);
        return days;
      }
      
      console.log('⚠️ [v3.0] No opening hours found in response, full data:', data);
      return [];
    } catch (error) {
      console.error('❌ [v3.0] Error fetching place details:', error);
      return [];
    }
  };

  // Helper function to extract days from Google Maps weekday_text
  const extractDaysFromWeekdayText = (weekdayText: string[]): string[] => {
    if (!weekdayText || weekdayText.length === 0) return [];
    
    const dayMap: Record<string, string> = {
      'Monday': 'Mon',
      'Tuesday': 'Tue', 
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat',
      'Sunday': 'Sun'
    };
    
    const openDays: string[] = [];
    weekdayText.forEach(text => {
      // Extract day name from text like "Monday: 7:00 AM – 10:00 PM"
      const dayName = text.split(':')[0].trim();
      const hours = text.split(':').slice(1).join(':').trim();
      
      // Only include days that aren't closed
      if (!hours.toLowerCase().includes('closed') && dayMap[dayName]) {
        openDays.push(dayMap[dayName]);
      }
    });
    
    return openDays;
  };

  // Fetch days for markets with place_ids
  const enrichMarketDays = async (markets: Record<string, any>) => {
    console.log('🚀 Starting enrichMarketDays - ALWAYS fetching fresh data from Google Places');
    console.log('📊 Processing', Object.keys(markets).length, 'markets');
    setLoadingMarketDays(true);
    const updatedDaysMap: Record<string, string[]> = { ...marketDaysMap };
    
    for (const [marketKey, market] of Object.entries(markets)) {
      console.log('🔍 Processing market:', marketKey, market);
      
      // Try to get place_id from the market object or from selected_markets
      const placeId = market.place_id;
      console.log('🔑 Place ID for', market.name, ':', placeId);
      
      if (placeId) {
        console.log('📞 Fetching FRESH days from Google Places for:', market.name);
        const days = await fetchPlaceDetails(placeId);
        
        if (days.length > 0) {
          console.log('✅ Got fresh days for', market.name, ':', days);
          updatedDaysMap[market.name] = days;
          
          // Update the database with fresh days
          try {
            const { error: updateError } = await supabase
              .from('markets')
              .update({ days })
              .match({ 
                name: market.name,
                address: market.address 
              });

            if (updateError) {
              console.error(`❌ Failed to update days in database for ${market.name}:`, updateError);
            } else {
              console.log(`💾 Updated days in database for ${market.name}`);
            }
          } catch (dbError) {
            console.error(`❌ Database error for ${market.name}:`, dbError);
          }
        } else {
          console.log('⚠️ No days returned from Google Places for:', market.name);
        }
      } else {
        console.log('⚠️ No place_id available for:', market.name);
      }
    }
    
    console.log('🎯 Final updatedDaysMap:', updatedDaysMap);
    setMarketDaysMap(updatedDaysMap);
    setLoadingMarketDays(false);
  };

  useEffect(() => {
    console.log('🚀 Homepage useEffect running...');
    fetchAcceptedSubmissions();
    fetchMarketAddresses();
    
    // Use IP-based location detection silently
    console.log('🌐 Starting IP location detection...');
    getLocationFromIP();
  }, []);

  // Enrich market days from Google Places API
  useEffect(() => {
    console.log('🔄 [v3.0] Markets enrichment useEffect triggered', {
      acceptedSubmissionsLength: acceptedSubmissions.length,
      marketAddressesMapKeys: Object.keys(marketAddressesMap).length,
      loadingMarketDays,
      marketDaysMapKeys: Object.keys(marketDaysMap).length
    });
    
    const markets = groupVendorsByMarket();
    console.log('📊 [v3.0] Grouped markets:', Object.keys(markets).length, markets);
    
    // ALWAYS call enrichMarketDays when markets are available
    if (Object.keys(markets).length > 0) {
      console.log('✅ [v3.0] Calling enrichMarketDays WITHOUT loadingMarketDays check...');
      enrichMarketDays(markets);
    } else {
      console.log('❌ [v3.0] No markets to enrich');
    }
  }, [acceptedSubmissions, marketAddressesMap]);

  // Initialize cached distances on component mount for instant display
  useEffect(() => {
    const cachedDistances = loadCachedDistances();
    if (Object.keys(cachedDistances).length > 0) {
      console.log('Loading cached distances for instant display:', Object.keys(cachedDistances).length, 'markets');
      setMarketDistances(cachedDistances);
    }
  }, []);


  // Calculate market distances independently and immediately
  useEffect(() => {
    console.log('🔄 useEffect triggered with:', {
      acceptedSubmissionsLength: acceptedSubmissions.length,
      filteredSubmissionsLength: filteredSubmissions.length,
      hasUserCoordinates: !!userCoordinates
    });
    
    if (filteredSubmissions.length > 0 && userCoordinates) {
      console.log('🔄 Processing filtered submissions with user coordinates');
      const markets = groupVendorsByMarket();
      console.log('📍 Grouped markets:', markets);
      if (markets.length > 0) {
        console.log('🏪 Starting market processing...');
        // Start market distance calculation immediately without waiting for vendor distances
        calculateMarketDistances(markets, userCoordinates);
        // Also fetch Google ratings for markets
        console.log('⭐ Starting Google ratings fetch...');
        fetchMarketGoogleRatings(markets);
      } else {
        console.log('⚠️ No markets found to process');
      }
    } else {
      console.log('⚠️ Missing data for market processing:', {
        filteredSubmissionsCount: filteredSubmissions.length,
        hasUserCoordinates: !!userCoordinates
      });
    }
  }, [filteredSubmissions, userCoordinates]);

  // Calculate vendor distances when vendors and user coordinates are available
  useEffect(() => {
    if (filteredSubmissions.length > 0 && userCoordinates) {
      console.log('🚚 Starting vendor distance calculation for', filteredSubmissions.length, 'vendors');
      calculateVendorDistances(filteredSubmissions, userCoordinates);
    }
  }, [filteredSubmissions, userCoordinates]);

  // Get location from IP address automatically
  const getLocationFromIP = async () => {
    try {
      console.log('🌐 Attempting IP geolocation...');
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🌐 IP geolocation response:', data);
      
      if (data.latitude && data.longitude) {
        console.log('📍 Setting user coordinates from IP:', { 
          lat: data.latitude, 
          lng: data.longitude,
          city: data.city,
          region: data.region 
        });
        setUserCoordinates({ 
          lat: data.latitude, 
          lng: data.longitude 
        });
        setLocationZipcode(data.postal || '');
        setLocationMethod('ip');
      } else {
        console.log('❌ IP geolocation data missing coordinates, using default location');
        // Set a default location (San Antonio area) for testing
        console.log('🏠 Using default San Antonio coordinates for testing');
        setUserCoordinates({ 
          lat: 29.4241, 
          lng: -98.4936 
        });
        setLocationMethod('ip');
      }
    } catch (error) {
      console.log('❌ IP geolocation failed:', error);
      // Set a default location (San Antonio area) for testing
      console.log('🏠 Using default San Antonio coordinates for testing');
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
      console.log('🌍 Starting location detection...');
      
      if (!navigator.geolocation) {
        console.log('❌ Geolocation not supported, using IP fallback');
        getLocationFromIP();
        return;
      }

      console.log('📍 Requesting GPS permission...');
      console.log('📍 Navigator.geolocation available:', !!navigator.geolocation);
      
      // Try GPS first with a short timeout
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords;
            
            console.log('✅ GPS Location Success!');
            console.log('📍 GPS Coordinates:', { lat: latitude, lng: longitude, accuracy: `${accuracy}m` });
            
            // Store user coordinates for distance calculations
            setUserCoordinates({ lat: latitude, lng: longitude });
            setLocationMethod('gps');
            
            // Get zipcode from GPS coordinates
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            
            if (response.ok) {
              const data = await response.json();
              const zipcode = data.postcode || data.postalCode || '';
              const city = data.city || data.locality || '';
              setLocationZipcode(zipcode);
              
              console.log('📮 Location Details:', { city, zipcode, lat: latitude, lng: longitude });
            }
          } catch (error) {
            console.error('❌ GPS geocoding error:', error);
            // Still keep the GPS coordinates even if zipcode lookup fails
          }
        },
        (error) => {
          // GPS failed or denied, fallback to IP
          console.log('❌ GPS location failed/denied:', error.message);
          console.log('🔄 Falling back to IP location...');
          
          getLocationFromIP();
        },
        {
          enableHighAccuracy: true,
          timeout: 8000, // Longer timeout for better accuracy
          maximumAge: 60000 // 1 minute cache
        }
      );
    } catch (error) {
      console.error('❌ Error in tryGPSLocationFirst function:', error);
      console.log('🔄 Falling back to IP location due to error...');
      getLocationFromIP();
    }
  };

  // Refresh data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAcceptedSubmissions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Automatically get location on page load
  useEffect(() => {
    if (!userCoordinates) {
      console.log('🌍 No user coordinates found, attempting automatic location detection...');
      tryGPSLocationFirst();
    }
  }, []);

  // Fetch submissions on initial page load
  useEffect(() => {
    fetchAcceptedSubmissions();
  }, []);

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

  const fetchAcceptedSubmissions = async () => {
    console.log('Fetching accepted submissions...');
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'accepted')
        .or('vacation_mode.is.null,vacation_mode.eq.false') // Only show vendors not in vacation mode
        .order('created_at', { ascending: false });

      console.log('Raw data from database:', data);
      console.log('Error from database:', error);

      if (error) throw error;
      
      const parsedSubmissions = data?.map(sub => ({
        ...sub,
        products: typeof sub.products === 'string' ? JSON.parse(sub.products) : sub.products,
        market_hours: sub.market_hours && typeof sub.market_hours === 'object' && sub.market_hours !== null 
          ? sub.market_hours as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
          : undefined
      })) || [];
      
      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;
      
      // Filter out "test store bb" unless user is nadiachibri@gmail.com
      const filteredSubmissions = parsedSubmissions.filter(submission => {
        if (submission.store_name?.toLowerCase() === 'test store bb') {
          return userEmail === 'nadiachibri@gmail.com';
        }
        return true;
      });
      
      console.log('Parsed submissions:', filteredSubmissions);
      setAcceptedSubmissions(filteredSubmissions);
      
      // Fetch ratings for all vendors
      const vendorIds = filteredSubmissions.map(sub => sub.id);
      if (vendorIds.length > 0) {
        await fetchVendorRatings(vendorIds);
      }
    } catch (error) {
      console.error('Error fetching accepted submissions:', error);
    } finally {
      setLoading(false);
    }
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
      {/* Mobile Category and Search - Fixed at bottom on mobile */}
      <div className="w-full flex md:hidden items-center space-x-4 px-4 py-3 fixed bottom-0 left-0 right-0 bg-background z-40 border-t">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <span className="truncate">Category</span>
                <ChevronDown className="h-4 w-4 ml-1 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-background border shadow-lg z-50">
              <DropdownMenuItem>
                <Link to="/search" className="w-full font-semibold">
                  All
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Fresh Flowers & Plants" className="w-full">
                  Fresh Flowers & Plants
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Bakery" className="w-full">
                  Bakery
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Dairy" className="w-full">
                  Dairy
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Rancher" className="w-full">
                  Rancher
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Beverages" className="w-full">
                  Beverages
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Seasonings & Spices" className="w-full">
                  Seasonings & Spices
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Pets" className="w-full">
                  Pets
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Home Goods" className="w-full">
                  Home Goods
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Farmers" className="w-full">
                  Farmers
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Ready to Eat" className="w-full">
                  Ready to Eat
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Packaged Goods & Snacks" className="w-full">
                  Packaged Goods & Snacks
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/search?category=Artisan" className="w-full">
                  Artisan
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Mobile Search Bar */}
          <div className="flex-1">
            <form onSubmit={(e) => {
              e.preventDefault();
              const params = new URLSearchParams(searchParams);
              if (searchQuery.trim()) {
                params.set('search', searchQuery.trim());
              } else {
                params.delete('search');
              }
              setSearchParams(params);
            }} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 bg-background/50 border-border"
                autoComplete="off"
              />
            </form>
          </div>
        </div>
      
      <div className="container mx-auto px-4 pt-8 pb-6 md:py-6">
        
        {/* Scope Toggle and View Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          {/* Filter and Sort */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            {/* Filter */}
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden md:inline">Filter</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isFilterOpen && "rotate-180")} />
            </Button>
            
            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[200px] bg-background border shadow-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="relevancy">Relevancy</SelectItem>
                <SelectItem value="lowest-price">Lowest Price</SelectItem>
                <SelectItem value="highest-price">Highest Price</SelectItem>
                <SelectItem value="top-rated">Top Rated Store</SelectItem>
                <SelectItem value="most-recent">Most Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search results indicator */}
          <div className="w-full sm:w-auto sm:ml-auto">
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap justify-end">
              <span>Showing {filteredSubmissions.length} result{filteredSubmissions.length !== 1 ? 's' : ''}</span>
              {searchQuery.trim() && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      const params = new URLSearchParams(location.search);
                      params.delete('search');
                      params.delete('q');
                      navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`, { replace: true });
                    }}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1 pr-1">
                Category: {selectedCategories.length > 0 ? selectedCategories.join(', ') : 'All'}
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedCategories([]);
                      const params = new URLSearchParams(location.search);
                      params.delete('category');
                      navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`, { replace: true });
                    }}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
              {searchScope === 'local' && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  Local
                </Badge>
              )}
              {(searchQuery.trim() || selectedCategories.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategories([]);
                    setSearchScope('nationwide');
                    navigate('/search', { replace: true });
                  }}
                  className="h-6 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Content - Collapsible */}
        {isFilterOpen && (
          <div className="w-full border rounded-lg bg-background shadow-lg mb-6 animate-accordion-down">
              <Tabs defaultValue="type" className="w-full flex flex-col overflow-hidden">
                <div className="pt-4 px-8 pl-9 flex items-center gap-6 md:gap-10 flex-shrink-0 border-b">
                  <TabsList className="inline-flex gap-4 md:gap-8 bg-transparent border-0 p-0 h-auto">
                    <TabsTrigger 
                      value="type" 
                      className="py-4 px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=inactive]:text-muted-foreground font-semibold"
                    >
                      Type
                    </TabsTrigger>
                    <TabsTrigger 
                      value="times" 
                      className="py-4 px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=inactive]:text-muted-foreground font-semibold"
                    >
                      Times
                    </TabsTrigger>
                    <TabsTrigger 
                      value="categories" 
                      className="py-4 px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=inactive]:text-muted-foreground font-semibold"
                    >
                      Categories
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDays([]);
                        setSelectedCategories([]);
                        setDayTimeSelections({});
                        toast({
                          title: "Filters cleared",
                          description: "All filters have been reset"
                        });
                      }}
                      className={cn(
                        "flex items-center gap-1 md:gap-2",
                        selectedDays.length > 0 || selectedCategories.length > 0 || Object.keys(dayTimeSelections).length > 0
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="text-sm">Reset</span>
                    </Button>
                  </div>
                </div>
                <TabsContent value="type" className="px-8 pb-8 pt-8 overflow-y-auto">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Scope Toggle */}
                    <div className="flex justify-start">
                      <div className="flex rounded-lg bg-muted p-1">
                        <button
                          onClick={() => setSearchScope('nationwide')}
                          className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                            searchScope === 'nationwide'
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Globe className="h-4 w-4 inline mr-1" />
                          All of US
                        </button>
                        <button
                          onClick={() => setSearchScope('local')}
                          className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                            searchScope === 'local'
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <MapPin className="h-4 w-4 inline mr-1" />
                          Local
                        </button>
                      </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex justify-start">
                      <div className="flex rounded-lg bg-muted p-1">
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
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="times" className="px-8 pb-8 pt-8 overflow-y-auto">
                    {/* Mobile layout - integrated day buttons with time selectors */}
                    <div className="md:hidden space-y-6 max-w-xs mx-auto">
                      {DAYS.map((day) => (
                        <div key={day} className="space-y-2">
                          <Button
                            type="button"
                            variant={selectedDays.includes(day) ? "default" : "outline"}
                            onClick={() => {
                              console.log('Day clicked:', day);
                              toggleDay(day);
                            }}
                            className={cn(
                              "h-12 w-full",
                              selectedDays.includes(day) && "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                          >
                            {day}
                          </Button>
                          {selectedDays.includes(day) && (
                            <div className="flex items-center gap-2 pl-2">
                              <div className="flex items-center gap-1">
                                <Select 
                                  value={dayTimeSelections[day]?.startTime || '08:00'}
                                  onValueChange={(value) => updateTimeSelection(day, 'startTime', value)}
                                >
                                  <SelectTrigger className="w-20 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-md z-50">
                                    {timeOptions.map((time) => (
                                      <SelectItem key={time} value={time}>{time}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <Select
                                  value={dayTimeSelections[day]?.startPeriod || 'AM'}
                                  onValueChange={(value: 'AM' | 'PM') => updateTimeSelection(day, 'startPeriod', value)}
                                >
                                  <SelectTrigger className="w-16 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-md z-50">
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <span className="text-muted-foreground text-sm">to</span>
                              
                              <div className="flex items-center gap-1">
                                <Select
                                  value={dayTimeSelections[day]?.endTime || '02:00'}
                                  onValueChange={(value) => updateTimeSelection(day, 'endTime', value)}
                                >
                                  <SelectTrigger className="w-20 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-md z-50">
                                    {timeOptions.map((time) => (
                                      <SelectItem key={time} value={time}>{time}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <Select
                                  value={dayTimeSelections[day]?.endPeriod || 'PM'}
                                  onValueChange={(value: 'AM' | 'PM') => updateTimeSelection(day, 'endPeriod', value)}
                                >
                                  <SelectTrigger className="w-16 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-md z-50">
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Desktop layout - separate sections */}
                    <div className="hidden md:block">
                      <div className="flex flex-row gap-2">
                        {DAYS.map((day) => (
                          <Button
                            key={day}
                            type="button"
                            variant={selectedDays.includes(day) ? "default" : "outline"}
                            onClick={() => {
                              console.log('Day clicked:', day);
                              toggleDay(day);
                            }}
                            className={cn(
                              "h-12 flex-1",
                              selectedDays.includes(day) && "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                      
                      {/* Time selectors for each selected day */}
                      <div className="grid grid-cols-1 gap-6">
                        {[...selectedDays].sort((a, b) => {
                          const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                          return dayOrder.indexOf(a) - dayOrder.indexOf(b);
                        }).map((day) => (
                          <div key={day} className="flex items-center gap-3 border-t pt-4">
                            <h5 className="font-semibold text-base mb-0 text-left min-w-[100px]">
                              {day === 'Mon' ? 'Monday' : 
                               day === 'Tue' ? 'Tuesday' :
                               day === 'Wed' ? 'Wednesday' :
                               day === 'Thu' ? 'Thursday' :
                               day === 'Fri' ? 'Friday' :
                               day === 'Sat' ? 'Saturday' : 'Sunday'}
                            </h5>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Select 
                                  value={dayTimeSelections[day]?.startTime || '08:00'}
                                  onValueChange={(value) => updateTimeSelection(day, 'startTime', value)}
                                >
                                  <SelectTrigger className="w-20 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-md z-50">
                                    {timeOptions.map((time) => (
                                      <SelectItem key={time} value={time}>{time}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <Select
                                  value={dayTimeSelections[day]?.startPeriod || 'AM'}
                                  onValueChange={(value: 'AM' | 'PM') => updateTimeSelection(day, 'startPeriod', value)}
                                >
                                  <SelectTrigger className="w-16 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-md z-50">
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <span className="text-muted-foreground text-sm">to</span>
                              
                              <div className="flex items-center gap-1">
                                <Select
                                  value={dayTimeSelections[day]?.endTime || '02:00'}
                                  onValueChange={(value) => updateTimeSelection(day, 'endTime', value)}
                                >
                                  <SelectTrigger className="w-20 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-md z-50">
                                    {timeOptions.map((time) => (
                                      <SelectItem key={time} value={time}>{time}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <Select
                                  value={dayTimeSelections[day]?.endPeriod || 'PM'}
                                  onValueChange={(value: 'AM' | 'PM') => updateTimeSelection(day, 'endPeriod', value)}
                                >
                                  <SelectTrigger className="w-16 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-md z-50">
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                </TabsContent>
                <TabsContent value="categories" className="px-8 pb-8 pt-8 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-xs md:max-w-none mx-auto">{SPECIALTY_CATEGORIES.map((category) => (
                        <Button
                          key={category}
                          type="button"
                          variant={selectedCategories.includes(category) ? "default" : "outline"}
                          onClick={() => toggleCategory(category)}
                          className={cn(
                            "h-12 text-sm justify-start",
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
                    size="sm"
                    onClick={() => setSelectedMarket(null)}
                  >
                    View All Vendors
                  </Button>
                </div>
              </div>
            )}
            
            {(selectedMarket ? selectedMarket.vendors : acceptedSubmissions).length === 0 ? (
              <div className="text-center">
                <p className="text-muted-foreground">
                  {selectedMarket ? 'No vendors in this market yet.' : 'No featured vendors yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {(selectedMarket ? selectedMarket.vendors : filteredSubmissions).map((submission) => (
                   <Card 
                     key={submission.id} 
                     className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer rounded-2xl" 
                     onClick={async () => {
                       // Get the same cached coordinates used for distance calculation
                        const cachedCoords = submission.market_address 
                          ? await getCoordinatesForAddress(submission.market_address)
                          : null;
                       
                       navigate('/market', { 
                         state: { 
                           type: 'vendor', 
                           selectedVendor: submission,
                           allVendors: selectedMarket ? selectedMarket.vendors : filteredSubmissions,
                           marketCoordinates: cachedCoords // Pass the exact coordinates used for "2.1 mi"
                         } 
                       });
                     }}
                  >
                    {/* Product Image */}
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
                      
                      {/* Star Rating Badge - Top Left */}
                      {((submission.google_rating && submission.google_rating > 0) || (vendorRatings[submission.id]?.totalReviews > 0)) && (
                        <div className="absolute top-2 left-2 z-10 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-xs font-medium">
                              {submission.google_rating && submission.google_rating > 0
                                ? submission.google_rating.toFixed(1)
                                : vendorRatings[submission.id]?.averageRating.toFixed(1)
                              }
                            </span>
                            {(submission.google_rating_count || vendorRatings[submission.id]?.totalReviews) && (
                              <span className="text-xs text-gray-600">
                                ({submission.google_rating_count || vendorRatings[submission.id]?.totalReviews || 0})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Like Button - Top Right */}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
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
                      {vendorDistances[submission.id] && vendorDistances[submission.id] !== '-- mi' && (
                        <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                          <span className="text-xs font-medium text-gray-700">{vendorDistances[submission.id]}</span>
                        </div>
                      )}

                      {/* Category Badge - Bottom Left */}
                      {submission.primary_specialty && (
                        <Badge className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm shadow-sm border-0 rounded-full px-3 py-1.5 hover:bg-white/90">
                          <span className="font-medium text-sm text-green-600">{submission.primary_specialty}</span>
                        </Badge>
                      )}

                    </div>
                    
                    {/* Store Information */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-lg font-semibold text-foreground text-left">
                        {submission.store_name.length > 20 
                          ? `${submission.store_name.slice(0, 20)}...`
                          : submission.store_name
                        }
                      </h3>

                      {/* Market Details Section with Carousel */}
                      <div className="mt-2">
                        {(() => {
                          // Get all markets for this vendor - handle various data structures
                          let allMarkets = [];
                          
                          try {
                            let marketsData = submission.selected_markets;
                            
                            // If it's a string, parse it
                            if (typeof marketsData === 'string') {
                              try {
                                marketsData = JSON.parse(marketsData);
                              } catch (e) {
                                console.error('Failed to parse markets JSON:', e);
                                marketsData = null;
                              }
                            }
                            
                            if (marketsData && Array.isArray(marketsData)) {
                              allMarkets = marketsData.map((market: any) => {
                                // Handle string format (old format)
                                if (typeof market === 'string') {
                                  return { name: market, address: submission.market_address || '' };
                                }
                                // Handle object format (new format)
                                if (market && typeof market === 'object') {
                                  // Ensure we extract strings, not objects
                                  const marketName = String(market.name || market.structured_formatting?.main_text || submission.selected_market || 'Farmers Market');
                                  const marketAddress = String(market.address || market.structured_formatting?.secondary_text || submission.market_address || '');
                                  return { name: marketName, address: marketAddress };
                                }
                                // Fallback
                                return { name: String(market), address: submission.market_address || '' };
                              });
                            } else {
                              // Fallback to single market
                              allMarkets = [{ 
                                name: String(submission.selected_market || submission.search_term || "Farmers Market"),
                                address: String(submission.market_address || '')
                              }];
                            }
                          } catch (error) {
                            console.error('Error parsing markets:', error);
                            // Ultimate fallback
                            allMarkets = [{ 
                              name: String(submission.selected_market || submission.search_term || "Farmers Market"),
                              address: String(submission.market_address || '')
                            }];
                          }
                          
                          const currentIndex = vendorMarketIndices[submission.id] || 0;
                          const currentMarket = allMarkets[currentIndex] || allMarkets[0] || { name: 'Farmers Market', address: '' };
                          const hasMultipleMarkets = allMarkets.length > 1;

                          return (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-foreground">
                                      {String(currentMarket.name || 'Farmers Market')}
                                    </h4>
                                    {hasMultipleMarkets && (
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setVendorMarketIndices(prev => ({
                                              ...prev,
                                              [submission.id]: (currentIndex - 1 + allMarkets.length) % allMarkets.length
                                            }));
                                          }}
                                          className="p-1 hover:bg-muted rounded transition-colors"
                                          aria-label="Previous market"
                                        >
                                          <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-xs text-muted-foreground">
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
                                  {currentMarket.address && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                      <p className="text-sm text-muted-foreground">
                                        {String(currentMarket.address).replace(/,\s*United States\s*$/i, '').trim()}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Market Days Badges */}
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
        ) : viewMode === 'markets' ? (
          <div className="flex justify-center">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center">
                <p className="text-muted-foreground">No markets available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {groupVendorsByMarket().map((market, index) => (
                   <Card 
                      key={index}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                       onClick={() => {
                         const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                         const marketDistance = marketDistances[marketId];
                         
                         navigate('/market', { 
                           state: { 
                             type: 'market', 
                             selectedMarket: market,
                             allVendors: market.vendors,
                             marketDistance: marketDistance // Pass the calculated distance
                           } 
                         });
                       }}
                   >
                     {/* Vendor Images Collage */}
                     <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                       {/* Google Rating Badge - Top Left */}
                       <div className="absolute top-2 left-2 z-10 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                         <div className="flex items-center gap-1">
                           <Star className="h-3 w-3 text-yellow-500 fill-current" />
                           <span className="text-xs font-medium">
                             {(() => {
                               const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                               return marketGoogleRatings[marketId]?.rating?.toFixed(1) || '0.0';
                             })()}
                           </span>
                           <span className="text-xs text-gray-600">
                             ({(() => {
                               const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                               return marketGoogleRatings[marketId]?.reviewCount || 0;
                             })()})
                           </span>
                         </div>
                       </div>

                       {/* Like Button - Top Right */}
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
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Distance Badge */}
                      <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                        <span className="text-xs font-medium text-gray-700">
                           {isLoadingMarketDistances ? (
                             <span className="animate-pulse">Loading...</span>
                           ) : (
                             (() => {
                               const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                               const distance = marketDistances[marketId];
                               console.log(`🎯 DISPLAYING DISTANCE for ${market.name}:`, {
                                 marketId,
                                 distance,
                                 allMarketDistances: marketDistances,
                                 source: distance ? 'market-distances' : 'none-found'
                               });
                               return distance || '-- miles';
                             })()
                           )}
                        </span>
                      </div>
                    </div>

                    {/* Market Information */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-base font-semibold text-foreground text-left">
                        {market.name}
                      </h3>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          {market.address.replace(/,\s*United States\s*$/i, '').trim()}
                        </p>
                      </div>
                      
                      {/* Market Days Badges */}
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
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            {(() => {
              // Extract all products from all vendors
              const allProducts = filteredSubmissions.flatMap(submission => {
                const products = submission.products || [];
                return products.map((product, productIndex) => ({
                  ...product,
                  id: product.id || productIndex, // Use product's existing ID or index within vendor
                  vendorId: submission.id,
                  vendorName: submission.store_name,
                  vendorSpecialty: submission.primary_specialty,
                  vendorDistance: undefined
                }));
              });

              // Sort products - prioritize products from liked vendors
              const sortedProducts = [...allProducts].sort((a, b) => {
                const aVendorLiked = isLiked(a.vendorId, 'vendor');
                const bVendorLiked = isLiked(b.vendorId, 'vendor');
                
                if (aVendorLiked && !bVendorLiked) return -1;
                if (!aVendorLiked && bVendorLiked) return 1;
                
                // Also check if product itself is liked
                const aProductLiked = isLiked(String(a.id), 'product');
                const bProductLiked = isLiked(String(b.id), 'product');
                
                if (aProductLiked && !bProductLiked) return -1;
                if (!aProductLiked && bProductLiked) return 1;
                
                return 0;
              });

              return sortedProducts.length === 0 ? (
                <div className="text-center">
                  <p className="text-muted-foreground">No products available yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
                  {sortedProducts.map((product, index) => (
                    <Card 
                      key={`${product.vendorId}-${index}`}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        const vendor = filteredSubmissions.find(v => v.id === product.vendorId);
                        if (vendor) {
                          // Set up the product modal
                          const productWithId = {
                            ...product,
                            id: product.id || index
                          };
                          setSelectedProduct(productWithId);
                          // Store vendor info separately
                          setCurrentVendorId(product.vendorId);
                          setCurrentVendorName(product.vendorName);
                          // Ensure all vendor products have IDs
                          const productsWithIds = (vendor.products || []).map((p: any, idx: number) => ({
                            ...p,
                            id: p.id || idx
                          }));
                          setCurrentVendorProducts(productsWithIds);
                          setIsProductModalOpen(true);
                        }
                      }}
                    >
                      {/* Product Image */}
                      <div className="aspect-[4/3] bg-muted relative overflow-hidden group">
                        {product.images && product.images.length > 0 ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name || 'Product'} 
                            className="w-full h-full object-cover transition-opacity duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No Image Available
                          </div>
                        )}
                        
                        
                        {/* Like Button */}
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
                      
                      {/* Product Information */}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-normal text-sm flex-1 text-black">
                            {product.name || 'Product'}
                          </h3>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            ${(product.price || 0).toFixed(2)}
                          </span>
                        </div>
                        {product.vendorName && (
                          <div className="mt-2 pt-2 border-t border-muted">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const vendor = filteredSubmissions.find(v => v.id === product.vendorId);
                                if (vendor) {
                                  navigate('/market', { 
                                    state: { 
                                      type: 'vendor', 
                                      selectedVendor: vendor,
                                      allVendors: filteredSubmissions
                                    } 
                                  });
                                }
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
             })()}
           </div>
         )}
        
        {/* Product Detail Modal */}
        <ProductDetailModal
          product={selectedProduct}
          products={currentVendorProducts}
          open={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setSelectedProduct(null);
            setCurrentVendorProducts([]);
            setCurrentVendorId(undefined);
            setCurrentVendorName(undefined);
          }}
          onProductChange={setSelectedProduct}
          vendorId={currentVendorId}
          vendorName={currentVendorName}
        />
      </div>
    </div>
  );
};

export default Homepage;