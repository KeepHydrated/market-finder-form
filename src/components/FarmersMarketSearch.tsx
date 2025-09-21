import React, { useState, useRef, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, ExternalLink } from 'lucide-react';

interface FarmersMarket {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  photos?: { photo_reference: string }[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export const FarmersMarketSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [markets, setMarkets] = useState<FarmersMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Error getting location:', error);
          // Default to San Antonio, TX if location access denied
          setUserLocation({ lat: 29.4241, lng: -98.4936 });
        }
      );
    } else {
      setUserLocation({ lat: 29.4241, lng: -98.4936 });
    }
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = async () => {
      if (!userLocation || !mapRef.current) return;

      try {
        const { data, error } = await supabase.functions.invoke('get-google-api-key');
        if (error || !data?.apiKey) {
          console.error('Failed to get Google API key:', error);
          return;
        }

        const loader = new Loader({
          apiKey: data.apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });

        await loader.load();

        const map = new google.maps.Map(mapRef.current, {
          center: userLocation,
          zoom: 12,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        googleMapRef.current = map;
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initializeMap();
  }, [userLocation]);

  const searchFarmersMarkets = async () => {
    if (!userLocation) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-google-api-key');
      if (error || !data?.apiKey) {
        console.error('Failed to get Google API key:', error);
        return;
      }

      // Use Google Places Text Search API to find farmers markets
      const query = searchQuery.trim() 
        ? `farmers market ${searchQuery}` 
        : 'farmers market';

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${userLocation.lat},${userLocation.lng}&radius=25000&key=${data.apiKey}&type=establishment`
      );

      const result = await response.json();

      if (result.results) {
        const farmersMarkets: FarmersMarket[] = result.results
          .filter((place: any) => 
            place.name.toLowerCase().includes('market') || 
            place.types?.includes('food') ||
            place.types?.includes('grocery_or_supermarket')
          )
          .map((place: any) => ({
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            opening_hours: place.opening_hours,
            photos: place.photos,
            geometry: place.geometry
          }));

        setMarkets(farmersMarkets);

        // Add markers to map
        if (googleMapRef.current) {
          // Clear existing markers
          googleMapRef.current = new google.maps.Map(mapRef.current!, {
            center: userLocation,
            zoom: 12
          });

          farmersMarkets.forEach((market) => {
            if (market.geometry?.location) {
              new google.maps.Marker({
                position: market.geometry.location,
                map: googleMapRef.current!,
                title: market.name,
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  `),
                  scaledSize: new google.maps.Size(30, 30)
                }
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error searching farmers markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Find Local Farmers Markets</h1>
        <p className="text-muted-foreground text-lg">
          Discover fresh, local produce and support your community farmers
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter location (e.g., 'downtown', 'near me', or specific address)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchFarmersMarkets()}
          className="flex-1"
        />
        <Button 
          onClick={searchFarmersMarkets} 
          disabled={loading}
          className="px-8"
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Map View</h2>
          <div 
            ref={mapRef} 
            className="w-full h-96 rounded-lg border bg-muted"
          />
        </div>

        {/* Results */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">
            Farmers Markets {markets.length > 0 && `(${markets.length})`}
          </h2>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {markets.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="mx-auto h-12 w-12 mb-4" />
                <p>Search for farmers markets in your area</p>
              </div>
            )}

            {markets.map((market) => (
              <Card key={market.place_id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{market.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {market.address}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {market.rating && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">⭐ {market.rating.toFixed(1)}</span>
                      {market.user_ratings_total && (
                        <span className="text-muted-foreground">
                          ({market.user_ratings_total} reviews)
                        </span>
                      )}
                    </div>
                  )}
                  
                  {market.opening_hours && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span className={market.opening_hours.open_now ? 'text-green-600' : 'text-red-600'}>
                        {market.opening_hours.open_now ? 'Open now' : 'Closed'}
                      </span>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openInGoogleMaps(market.address)}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Google Maps
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};