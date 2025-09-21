import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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

interface FarmersMarketSearchProps {
  selectedMarkets: FarmersMarket[];
  onMarketsChange: (markets: FarmersMarket[]) => void;
  maxMarkets?: number;
  isEditing?: boolean;
}

export const FarmersMarketSearch = ({ 
  selectedMarkets, 
  onMarketsChange, 
  maxMarkets = 3,
  isEditing = true
}: FarmersMarketSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<FarmersMarket[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isShowingSpecificMarket, setIsShowingSpecificMarket] = useState(false);
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
      if (!searchQuery.trim() || searchQuery.length < 2 || isShowingSpecificMarket) {
        if (!isShowingSpecificMarket) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
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
  }, [searchQuery, userLocation, isShowingSpecificMarket]);

  const handleSuggestionClick = (market: FarmersMarket) => {
    // Check if market is already selected
    const isAlreadySelected = selectedMarkets.some(selected => selected.place_id === market.place_id);
    if (isAlreadySelected) return;
    
    // Check if we've reached the maximum
    if (selectedMarkets.length >= maxMarkets) return;
    
    console.log('Selected market:', market.name);
    onMarketsChange([...selectedMarkets, market]);
    setSearchQuery(''); // Clear search after selection
    setShowSuggestions(false);
  };

  const removeMarket = (marketToRemove: FarmersMarket) => {
    onMarketsChange(selectedMarkets.filter(market => market.place_id !== marketToRemove.place_id));
  };

  const handleMarketBadgeClick = (market: FarmersMarket) => {
    if (!isEditing) return;
    
    // Populate search with market name and show only this specific market
    const marketName = market.structured_formatting?.main_text || market.name;
    setSearchQuery(marketName);
    
    // Show only the clicked market in suggestions
    setSuggestions([market]);
    setShowSuggestions(true);
    setIsShowingSpecificMarket(true);
    
    // Focus the input
    inputRef.current?.focus();
  };

  // Filter out already selected markets from suggestions (unless showing specific market)
  const filteredSuggestions = isShowingSpecificMarket 
    ? suggestions 
    : suggestions.filter(
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
    <div className="max-w-6xl space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={
              selectedMarkets.length >= maxMarkets 
                ? "Maximum markets selected" 
                : isEditing
                  ? "Search for farmers markets..."  
                  : "Edit to change markets"
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsShowingSpecificMarket(false); // Reset when user types
            }}
            onFocus={() => filteredSuggestions.length > 0 && isEditing && setShowSuggestions(true)}
            className="pl-10 pr-4 py-3 text-lg"
            autoComplete="off"
            disabled={selectedMarkets.length >= maxMarkets || !isEditing}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
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
        <div className="max-w-2xl space-y-3">
          <Label className="text-muted-foreground">Selected Markets ({selectedMarkets.length}/{maxMarkets})</Label>
          <div className="flex flex-wrap gap-2">
            {selectedMarkets.map((market) => (
              <Badge
                key={market.place_id}
                variant="secondary"
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleMarketBadgeClick(market)}
                >
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-xs">
                    {market.structured_formatting?.main_text || market.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMarket(market);
                  }}
                  disabled={!isEditing}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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