import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Heart, Star, Filter, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
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
            title: "Location found",
            description: `Zipcode updated to ${zipcode}`,
          });
        } catch (error) {
          console.error('Geocoding error:', error);
          toast({
            title: "Error",
            description: "Failed to get zipcode from your location. Please enter it manually.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        setIsLoadingLocation(false);
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
          title: "Location Error",
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
        
        {/* Filter Button */}
        <div className="flex justify-end mb-6">
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
                    <h4 className="font-medium">Time *</h4>
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
                        <div className="flex items-center gap-3">
                          <Select 
                            value={dayTimeSelections[day]?.startTime || '08:00'}
                            onValueChange={(value) => updateTimeSelection(day, 'startTime', value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={dayTimeSelections[day]?.startPeriod || 'AM'}
                            onValueChange={(value: 'AM' | 'PM') => updateTimeSelection(day, 'startPeriod', value)}
                          >
                            <SelectTrigger className="w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <span className="text-muted-foreground">to</span>
                          
                          <Select
                            value={dayTimeSelections[day]?.endTime || '02:00'}
                            onValueChange={(value) => updateTimeSelection(day, 'endTime', value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={dayTimeSelections[day]?.endPeriod || 'PM'}
                            onValueChange={(value: 'AM' | 'PM') => updateTimeSelection(day, 'endPeriod', value)}
                          >
                            <SelectTrigger className="w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="categories" className="p-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Categories *</h4>
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
                    

                    {/* Zipcode Section */}
                    <div className="space-y-4">
                      <h5 className="font-medium">Zipcode</h5>
                      <div className="relative">
                        <Input 
                          value={locationZipcode}
                          onChange={(e) => setLocationZipcode(e.target.value)}
                          placeholder="Zipcode will appear here..." 
                          className="bg-background h-12 text-lg border-2 border-border rounded-xl pr-16"
                        />
                        <Button 
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white h-8 w-8 p-0 rounded-lg"
                          onClick={getCurrentLocation}
                          disabled={isLoadingLocation}
                        >
                          <RotateCcw className={`h-4 w-4 ${isLoadingLocation ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Click the button to get your current zipcode.
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
        
        <div className="flex justify-center">
          {acceptedSubmissions.length === 0 ? (
            <div className="text-center">
              <p className="text-muted-foreground">No featured vendors yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {acceptedSubmissions.map((submission) => (
                <Card 
                  key={submission.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" 
                  onClick={() => navigate('/vendor')}
                >
                  {/* Product Image */}
                  <div className="aspect-video bg-muted relative">
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
                    
                    {/* Like Button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle like functionality here
                      }}
                    >
                      <Heart className="h-4 w-4 text-gray-600" />
                    </Button>
                  </div>
                  
                  {/* Store Information */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-lg font-semibold text-foreground text-left">
                      {submission.store_name}
                    </h3>
                    
                    {submission.primary_specialty && (
                      <p className="text-sm text-muted-foreground text-left">
                        {submission.primary_specialty}
                      </p>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-1 pt-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">
                        {vendorRatings[submission.id]?.totalReviews > 0 
                          ? vendorRatings[submission.id].averageRating.toFixed(1)
                          : '0.0'
                        }
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({vendorRatings[submission.id]?.totalReviews || 0} reviews)
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Homepage;