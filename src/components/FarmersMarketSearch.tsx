import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, ExternalLink, Search } from 'lucide-react';

// Updated: Removed Google Maps functionality

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
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export const FarmersMarketSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<FarmersMarket[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<FarmersMarket | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

  // Search for farmers markets with debouncing
  useEffect(() => {
    const searchFarmersMarkets = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setLoading(true);
      try {
        console.log('Calling farmers-market-search function with query:', searchQuery);
        const { data, error } = await supabase.functions.invoke('farmers-market-search', {
          body: {
            query: searchQuery,
            location: userLocation
          }
        });

        console.log('Function response:', { data, error });

        if (error) {
          console.error('Error searching farmers markets:', error);
          return;
        }

        setSuggestions(data.predictions || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error searching farmers markets:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchFarmersMarkets, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, userLocation]);

  const handleSuggestionClick = (market: FarmersMarket) => {
    console.log('Selected market opening hours:', market.opening_hours);
    setSelectedMarket(market);
    setSearchQuery(market.structured_formatting?.main_text || market.name);
    setShowSuggestions(false);
  };

  const openInGoogleMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Which farmers markets do you sell at? (Up to 3) *</h1>
        <p className="text-muted-foreground text-lg">
          Search for farmers markets near you
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for farmers markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="pl-10 pr-4 py-3 text-lg"
            autoComplete="off"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 bg-background border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto mt-1"
          >
            {suggestions.map((market) => (
              <div
                key={market.place_id}
                className="flex items-center p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                onClick={() => handleSuggestionClick(market)}
              >
                <MapPin className="h-4 w-4 text-muted-foreground mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {market.structured_formatting?.main_text || market.name}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {market.structured_formatting?.secondary_text || market.address}
                  </div>
                  {market.rating && (
                    <div className="text-xs text-muted-foreground mt-1">
                      ⭐ {market.rating.toFixed(1)}
                      {market.user_ratings_total && ` (${market.user_ratings_total} reviews)`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Selected Market Details */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Market Details</h2>
          
          {selectedMarket ? (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{selectedMarket.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {selectedMarket.address}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedMarket.rating && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">⭐ {selectedMarket.rating.toFixed(1)}</span>
                    {selectedMarket.user_ratings_total && (
                      <span className="text-muted-foreground">
                        ({selectedMarket.user_ratings_total} reviews)
                      </span>
                    )}
                  </div>
                )}
                
                {selectedMarket.opening_hours && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span className={selectedMarket.opening_hours.open_now ? 'text-green-600' : 'text-red-600'}>
                        {selectedMarket.opening_hours.open_now ? 'Open now' : 'Closed'}
                      </span>
                    </div>
                    {selectedMarket.opening_hours.weekday_text && selectedMarket.opening_hours.weekday_text.length > 0 ? (
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-foreground">Hours:</div>
                        {selectedMarket.opening_hours.weekday_text.map((hours, index) => (
                          <div key={index} className="text-muted-foreground text-xs">
                            {hours}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Detailed hours not available - check Google Maps for more info
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openInGoogleMaps(selectedMarket.address)}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Google Maps
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="mx-auto h-12 w-12 mb-4" />
              <p>Search and select a farmers market to see details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};