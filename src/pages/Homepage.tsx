import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
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
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();
  const [acceptedSubmissions, setAcceptedSubmissions] = useState<AcceptedSubmission[]>([]);
  const [vendorRatings, setVendorRatings] = useState<Record<string, VendorRating>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
  const [viewMode, setViewMode] = useState<'markets' | 'vendors'>('vendors');
  const [selectedMarket, setSelectedMarket] = useState<{
    name: string;
    address: string;
    vendors: AcceptedSubmission[];
  } | null>(null);
  const [vendorDistances, setVendorDistances] = useState<Record<string, string>>({});
  const [locationMethod, setLocationMethod] = useState<'ip' | 'gps'>('ip');
  const [isGettingGPSLocation, setIsGettingGPSLocation] = useState(false);

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

  // Calculate distances for all vendors
  const calculateVendorDistances = async (vendors: AcceptedSubmission[], userCoords: {lat: number, lng: number}) => {
    console.log('=== DISTANCE CALCULATION DEBUG ===');
    console.log('User coordinates:', userCoords);
    console.log('Starting distance calculations for', vendors.length, 'vendors');
    
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
        console.log('Getting coordinates for vendor:', vendor.id);
        // Get coordinates for this vendor (with caching)
        const vendorCoords = await cacheVendorCoordinates(vendor.id, vendor.market_address);
        console.log('Vendor coordinates result:', vendorCoords);
        
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
          
          console.log('Final distance:', finalDistance);
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
    
    console.log('Final distances:', distances);
    console.log('=== END DISTANCE DEBUG ===');
    setVendorDistances(distances);
  };

  // Group vendors by market
  const groupVendorsByMarket = () => {
    const markets: Record<string, {
      name: string;
      address: string;
      vendors: AcceptedSubmission[];
    }> = {};

    acceptedSubmissions.forEach(submission => {
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
    
    // Add immediate test log
    console.log('📍 About to try GPS location detection...');
    
    // Try GPS with error handling
    try {
      tryGPSLocationFirst();
    } catch (error) {
      console.error('❌ Error in tryGPSLocationFirst:', error);
      getLocationFromIP(); // Fallback to IP
    }
  }, []);

  // Calculate distances when vendors or user coordinates change
  useEffect(() => {
    if (acceptedSubmissions.length > 0 && userCoordinates) {
      calculateVendorDistances(acceptedSubmissions, userCoordinates);
    }
  }, [acceptedSubmissions, userCoordinates]);

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
        
        toast({
          title: "📡 Using IP Location", 
          description: `Approximate location: ${data.city}, ${data.region}. Enable GPS for precise distances.`
        });
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
              
              toast({
                title: "📍 GPS Location Active",
                description: `Using precise location in ${city}${zipcode ? `, ${zipcode}` : ''}`,
              });
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
          
          toast({
            title: "Location Permission Needed",
            description: "Using approximate IP location. Allow GPS for precise distances.",
            variant: "destructive"
          });
          
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
                <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
                  <TabsTrigger value="times">Times</TabsTrigger>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                </TabsList>
                <TabsContent value="times" className="p-4">
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
                <TabsContent value="categories" className="p-4">
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
                <TabsContent value="location" className="p-4">
                  <div className="space-y-6">
                    
                    {/* Location Method Status */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Current Location Method:</span>
                        <Badge variant={locationMethod === 'gps' ? 'default' : 'secondary'}>
                          {locationMethod === 'gps' ? 'GPS (Precise)' : 'IP (Approximate)'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {locationMethod === 'gps' 
                          ? 'Using your exact GPS location for accurate distance calculations.'
                          : 'Using your IP location. For precise distances, try GPS location below.'
                        }
                      </p>
                    </div>

                    {/* GPS Location Button */}
                    <div className="space-y-4">
                      <h5 className="font-medium">Get Precise Location</h5>
                      <Button 
                        onClick={getCurrentLocation}
                        disabled={isGettingGPSLocation}
                        className="w-full h-12 flex items-center gap-2"
                        variant={locationMethod === 'gps' ? 'default' : 'outline'}
                      >
                        <MapPin className={`h-4 w-4 ${isGettingGPSLocation ? 'animate-pulse' : ''}`} />
                        {isGettingGPSLocation ? 'Getting GPS Location...' : 'Use My GPS Location'}
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Get your exact GPS coordinates for the most accurate vendor distances.
                      </p>
                    </div>

                    {/* Zipcode Section */}
                    <div className="space-y-4">
                      <h5 className="font-medium">Zipcode</h5>
                      <div className="relative">
                        <Input 
                          value={locationZipcode}
                          onChange={(e) => setLocationZipcode(e.target.value)}
                          placeholder="Zipcode will appear here..." 
                          className="bg-background h-12 text-lg border-2 border-border rounded-xl"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your current zipcode (automatically detected).
                      </p>
                    </div>
                    
                    {/* Range Slider */}
                    <div className="space-y-4">
                      <h5 className="font-medium">Search Radius</h5>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Distance</span>
                          <span className="text-sm font-medium">{rangeMiles[0]} miles</span>
                        </div>
                        <Slider
                          value={rangeMiles}
                          onValueChange={setRangeMiles}
                          max={25}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1 mile</span>
                          <span>25 miles</span>
                        </div>
                      </div>
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
                {(selectedMarket ? selectedMarket.vendors : acceptedSubmissions).map((submission) => (
                  <Card 
                    key={submission.id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer min-h-[450px]" 
                    onClick={() => navigate('/market', { 
                      state: { 
                        type: 'vendor', 
                        selectedVendor: submission,
                        allVendors: selectedMarket ? selectedMarket.vendors : acceptedSubmissions 
                      } 
                    })}
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

                      {/* Market Details Section - Moved to bottom */}
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
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            {acceptedSubmissions.length === 0 ? (
              <div className="text-center">
                <p className="text-muted-foreground">No markets available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {groupVendorsByMarket().map((market, index) => (
                   <Card 
                      key={index}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer min-h-[450px]"
                      onClick={() => navigate('/market', { 
                        state: { 
                          type: 'market', 
                          selectedMarket: market,
                          allVendors: market.vendors 
                        } 
                      })}
                   >
                    {/* Vendor Images Collage */}
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
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
                          // Create a unique market ID by combining market name and address
                          const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                          await toggleLike(marketId, 'market');
                        }}
                      >
                        <Heart 
                          className={cn(
                            "h-4 w-4 transition-colors",
                            (() => {
                              const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                              return isLiked(marketId, 'market');
                            })()
                              ? "text-red-500 fill-current" 
                              : "text-gray-600"
                          )} 
                        />
                      </Button>
                      
                      {/* Distance Badge - Bottom Right */}
                      <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                        <span className="text-xs font-medium text-gray-700">
                          {userCoordinates 
                            ? `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 9)} miles`
                            : `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 9)} miles`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Market Information */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-xs font-semibold text-foreground">
                        {market.name}
                      </h3>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          {market.address}
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
        )}
      </div>
    </div>
  );
};

export default Homepage;