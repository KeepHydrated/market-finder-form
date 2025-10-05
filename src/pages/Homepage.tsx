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

  // Handle category selection from URL and navigate to new page
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    
    if (categoryParam) {
      // Navigate to the new CategoryProducts page
      navigate(`/category?category=${encodeURIComponent(categoryParam)}`);
    }
  }, [searchParams, navigate]);

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
    
    setFilteredSubmissions(filtered);
  }, [acceptedSubmissions, searchQuery, selectedCategories, searchParams]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => {
      const newSelected = prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day];
      
      // Initialize time selection for newly selected day
      if (!prev.includes(day)) {
        setDayTimeSelections(prevTimes => ({
          ...prevTimes,
          [day]: {
            startTime: '08:00',
            startPeriod: 'AM',
            endTime: '02:00',
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

              // Store/update the rating in the database using insert with ON CONFLICT
              const { error: insertError } = await supabase
                .from('markets')
                .insert({
                  name: market.name,
                  address: market.address,
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
                const { error: updateError } = await supabase
                  .from('markets')
                  .update({
                    google_rating: marketData.rating,
                    google_rating_count: marketData.user_ratings_total,
                    google_place_id: marketData.place_id,
                    last_rating_update: new Date().toISOString()
                  })
                  .eq('name', market.name)
                  .eq('address', market.address);

                if (updateError) {
                  console.error(`❌ Error updating rating for ${market.name}:`, updateError);
                } else {
                  console.log(`💾 Updated rating for ${market.name} in database`);
                }
              } else {
                console.log(`💾 Stored rating for ${market.name} in database`);
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
        if (vendor.market_address) {
          // Get coordinates for vendor's market
          const marketCoords = await getCoordinatesForAddress(vendor.market_address);
          
          if (marketCoords) {
            // Try Google Maps distance first
            const googleDistance = await getGoogleMapsDistance(
              userCoords.lat, 
              userCoords.lng, 
              marketCoords.lat, 
              marketCoords.lng
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
                marketCoords.lat, 
                marketCoords.lng
              );
              finalDistance = `${distanceInMiles.toFixed(1)} mi`;
              console.log(`⚠️ Fallback distance for ${vendor.store_name}: ${finalDistance}`);
            }
            
            newDistances[vendor.id] = finalDistance;
          } else {
            console.log(`⚠️ Could not get coordinates for ${vendor.store_name}`);
            newDistances[vendor.id] = '-- mi';
          }
        } else {
          console.log(`⚠️ No market address for ${vendor.store_name}`);
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

  // Group vendors by market
  const groupVendorsByMarket = () => {
    const markets: Record<string, {
      name: string;
      address: string;
      vendors: AcceptedSubmission[];
    }> = {};

    filteredSubmissions.forEach(submission => {
      const marketKey = submission.selected_market || submission.search_term || 'Unknown Market';
      const marketAddress = submission.market_address || 'Address not available';
      
      if (!markets[marketKey]) {
        markets[marketKey] = {
          name: marketKey,
          address: marketAddress,
          vendors: []
        };
      }
      
      markets[marketKey].vendors.push(submission);
    });

    return Object.values(markets);
  };

  useEffect(() => {
    console.log('🚀 Homepage useEffect running...');
    fetchAcceptedSubmissions();
    
    // Use IP-based location detection silently
    console.log('🌐 Starting IP location detection...');
    getLocationFromIP();
  }, []);

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
      
      console.log('Parsed submissions:', parsedSubmissions);
      setAcceptedSubmissions(parsedSubmissions);
      
      // Fetch ratings for all vendors
      const vendorIds = parsedSubmissions.map(sub => sub.id);
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
      <div className="container mx-auto px-4 py-6">
        
        {/* View Toggle and Filter Button */}
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
                    
                    {/* Time selectors for each selected day */}
                    <div className="grid grid-cols-2 gap-12">
                      {selectedDays.map((day) => (
                        <div key={day} className="space-y-3 border-t pt-4">
                          <h5 className="font-medium capitalize">
                            {day === 'Mon' ? 'Monday' : 
                             day === 'Tue' ? 'Tuesday' :
                             day === 'Wed' ? 'Wednesday' :
                             day === 'Thu' ? 'Thursday' :
                             day === 'Fri' ? 'Friday' :
                             day === 'Sat' ? 'Saturday' : 'Sunday'}
                          </h5>
                          <div className="flex items-center justify-between">
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
                <TabsContent value="categories" className="px-8 pb-8 pt-8">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {SPECIALTY_CATEGORIES.map((category) => (
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
            </DialogContent>
          </Dialog>
        </div>
        
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
                     className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer min-h-[450px]" 
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

                      {/* Distance Badge */}
                      <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                        <span className="text-xs font-medium text-gray-700">
                          {isLoadingVendorDistances ? (
                            <span className="animate-pulse">Loading...</span>
                          ) : (
                            vendorDistances[submission.id] || '-- miles'
                          )}
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

                      {/* Market Details Section - Moved to bottom */}
                      <div className="mt-2">
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          {submission.selected_market || submission.search_term || "Farmers Market"}
                        </h4>
                        {submission.market_address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                              {submission.market_address.replace(/, United States$/, '')}
                            </p>
                          </div>
                        )}
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
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer min-h-[450px]"
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
                          {market.address.replace(/, United States$/, '')}
                        </p>
                      </div>
                      
                      <p className="text-sm text-foreground">
                        {market.vendors.length} vendor{market.vendors.length !== 1 ? 's' : ''}
                      </p>
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
              const allProducts = filteredSubmissions.flatMap(submission => 
                (submission.products || []).map(product => ({
                  ...product,
                  vendorId: submission.id,
                  vendorName: submission.store_name,
                  vendorSpecialty: submission.primary_specialty,
                  vendorDistance: undefined
                }))
              );

              return allProducts.length === 0 ? (
                <div className="text-center">
                  <p className="text-muted-foreground">No products available yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
                  {allProducts.map((product, index) => (
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
                          setCurrentVendorProducts(vendor.products || []);
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
                            await toggleLike(`${product.vendorId}-${product.name}`, 'product');
                          }}
                        >
                          <Heart 
                            className={cn(
                              "h-4 w-4 transition-colors",
                              isLiked(`${product.vendorId}-${product.name}`, 'product')
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
          }}
          onProductChange={setSelectedProduct}
          vendorId={selectedProduct?.vendorId}
          vendorName={selectedProduct?.vendorName}
        />
      </div>
    </div>
  );
};

export default Homepage;