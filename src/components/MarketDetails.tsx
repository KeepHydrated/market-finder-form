import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, ArrowLeft, Navigation } from "lucide-react";
import { getGoogleMapsDistance, calculateDistance, getCoordinatesForAddress } from "@/lib/geocoding";

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string;
}

interface MarketDetailsProps {
  market: Market;
  onBack: () => void;
}

export const MarketDetails = ({ market, onBack }: MarketDetailsProps) => {
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [distance, setDistance] = useState<string>('');
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);

  // Get user location and calculate distance
  useEffect(() => {
    const getUserLocationAndCalculateDistance = async () => {
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
              
              // Get market coordinates
              const marketAddress = `${market.address}, ${market.city}, ${market.state}`;
              const marketCoords = await getCoordinatesForAddress(marketAddress);
              
              if (marketCoords) {
                // Try Google Maps distance first, fall back to Haversine
                const googleDistance = await getGoogleMapsDistance(
                  userCoords.lat, 
                  userCoords.lng, 
                  marketCoords.lat, 
                  marketCoords.lng
                );
                
                if (googleDistance) {
                  setDistance(googleDistance.distance);
                } else {
                  // Fallback to Haversine calculation
                  const distanceInMiles = calculateDistance(
                    userCoords.lat, 
                    userCoords.lng, 
                    marketCoords.lat, 
                    marketCoords.lng
                  );
                  setDistance(`${distanceInMiles.toFixed(1)} miles`);
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

    getUserLocationAndCalculateDistance();
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