import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, ExternalLink, Search, X } from 'lucide-react';

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
  const [selectedMarkets, setSelectedMarkets] = useState<FarmersMarket[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const maxMarkets = 3;

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
    // Check if market is already selected
    const isAlreadySelected = selectedMarkets.some(selected => selected.place_id === market.place_id);
    if (isAlreadySelected) return;
    
    // Check if we've reached the maximum
    if (selectedMarkets.length >= maxMarkets) return;
    
    console.log('Selected market:', market.name);
    setSelectedMarkets(prev => [...prev, market]);
    setSearchQuery(''); // Clear search after selection
    setShowSuggestions(false);
  };

  const removeMarket = (marketToRemove: FarmersMarket) => {
    setSelectedMarkets(prev => prev.filter(market => market.place_id !== marketToRemove.place_id));
  };

  // Filter out already selected markets from suggestions
  const filteredSuggestions = suggestions.filter(
    suggestion => !selectedMarkets.some(selected => selected.place_id === suggestion.place_id)
  );

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
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={
              selectedMarkets.length >= maxMarkets 
                ? "Maximum markets selected" 
                : "Search for farmers markets..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => filteredSuggestions.length > 0 && setShowSuggestions(true)}
            className="pl-10 pr-4 py-3 text-lg"
            autoComplete="off"
            disabled={selectedMarkets.length >= maxMarkets}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 bg-background border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto mt-1"
          >
            {filteredSuggestions.map((market) => (
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

        {/* Maximum reached message */}
        {selectedMarkets.length >= maxMarkets && (
          <div className="text-center text-sm text-muted-foreground mt-2">
            Maximum of {maxMarkets} markets selected
          </div>
        )}
      </div>

      {/* Selected Markets */}
      {selectedMarkets.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-3">
          <h3 className="text-lg font-semibold">Selected Markets ({selectedMarkets.length}/{maxMarkets})</h3>
          <div className="flex flex-wrap gap-2">
            {selectedMarkets.map((market) => (
              <Badge
                key={market.place_id}
                variant="secondary"
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-xs">
                  {market.structured_formatting?.main_text || market.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeMarket(market)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-1 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};