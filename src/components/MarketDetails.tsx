import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, ArrowLeft, Navigation } from "lucide-react";
import { getGoogleMapsDistance, calculateDistance, getCoordinatesForAddress } from "@/lib/geocoding";
import { supabase } from "@/integrations/supabase/client";

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface MarketDetailsProps {
  market: Market;
  onBack: () => void;
}

export const MarketDetails = ({ market, onBack }: MarketDetailsProps) => {
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [distance, setDistance] = useState<string>('');
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);

  // Calculate distance to market (using same coordinates as vendor card)
  useEffect(() => {
    const calculateDistanceToMarket = async () => {
      setIsLoadingDistance(true);
      
      try {
        // Get user location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const userCoords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              setUserCoordinates(userCoords);
              
              // Use the exact same coordinates that were used in the vendor card
              let marketCoords = null;
              
              // If we have geometry coordinates passed from the vendor card, use those directly
              if (market.geometry?.location) {
                marketCoords = {
                  lat: market.geometry.location.lat,
                  lng: market.geometry.location.lng
                };
                console.log('🗺️ Using passed geometry coordinates:', marketCoords);
              } else {
                // Fallback: try to get coordinates from Places API
                const marketAddress = `${market.address}, ${market.city}, ${market.state}`;
                try {
                  const response = await supabase.functions.invoke('farmers-market-search', {
                    body: { 
                      query: market.name
                    }
                  });
                  
                  if (response.data?.predictions?.length > 0) {
                    const foundMarket = response.data.predictions.find((m: any) => 
                      m.name === market.name || 
                      m.address?.includes(market.address) ||
                      m.formatted_address?.includes(market.address)
                    );
                    
                    if (foundMarket?.geometry?.location) {
                      marketCoords = {
                        lat: foundMarket.geometry.location.lat,
                        lng: foundMarket.geometry.location.lng
                      };
                      console.log('🗺️ Using Places API coordinates:', marketCoords);
                    }
                  }
                } catch (error) {
                  console.error('Error getting coordinates from Places API:', error);
                }
                
                // Final fallback to geocoding address
                if (!marketCoords) {
                  marketCoords = await getCoordinatesForAddress(marketAddress);
                  console.log('🗺️ Using geocoded coordinates:', marketCoords);
                }
              }
              
              if (marketCoords) {
                // Use Google Maps Distance Matrix API (same as vendor card)
                const googleDistance = await getGoogleMapsDistance(
                  userCoords.lat, 
                  userCoords.lng, 
                  marketCoords.lat, 
                  marketCoords.lng
                );
                
                if (googleDistance) {
                  // Show just the distance without duration to match vendor card format
                  setDistance(googleDistance.distance);
                } else {
                  setDistance('Distance unavailable');
                }
              }
              
              setIsLoadingDistance(false);
            },
            (error) => {
              console.error('Error getting user location:', error);
              setIsLoadingDistance(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
          );
        } else {
          setIsLoadingDistance(false);
        }
      } catch (error) {
        console.error('Error calculating distance:', error);
        setIsLoadingDistance(false);
      }
    };

    calculateDistanceToMarket();
  }, [market]);

  return (
    <div className="space-y-6">
      <Button 
        onClick={onBack} 
        variant="outline" 
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Search
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">{market.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-foreground font-medium">{market.address}</p>
              <p className="text-muted-foreground">{market.city}, {market.state}</p>
              {distance && (
                <div className="flex items-center gap-1 mt-1">
                  <Navigation className="h-3 w-3 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">{distance}</p>
                </div>
              )}
              {isLoadingDistance && (
                <p className="text-muted-foreground text-sm mt-1">Calculating distance...</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <p className="text-foreground">{market.hours}</p>
          </div>
          
          <div>
            <h3 className="font-medium text-foreground mb-3">Market Days</h3>
            <div className="flex flex-wrap gap-2">
              {market.days.map((day) => (
                <Badge key={day} variant="secondary" className="px-3 py-1">
                  {day}
                </Badge>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-muted-foreground text-center">
              Use the Submit tab in your profile to apply to this market.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};