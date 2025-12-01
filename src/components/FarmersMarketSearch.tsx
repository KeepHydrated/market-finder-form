import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, ExternalLink, Search, X, Navigation } from 'lucide-react';
import { getGoogleMapsDistance } from '@/lib/geocoding';

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
  const [isBadgeClick, setIsBadgeClick] = useState(false);
  const [marketDistances, setMarketDistances] = useState<Record<string, string>>({});
  const [isLoadingDistances, setIsLoadingDistances] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get user's location - prioritize IP-based geolocation for accuracy
  useEffect(() => {
    const getIPLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.latitude && data.longitude) {
          console.log('Using IP-based location:', data.city, data.region, data.latitude, data.longitude);
          setUserLocation({
            lat: data.latitude,
            lng: data.longitude
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error getting IP location:', error);
        return false;
      }
    };

    // Try IP location first
    getIPLocation().then(success => {
      if (!success) {
        // Fall back to browser geolocation if IP fails
        if (navigator.geolocation) {
          console.log('IP location failed, trying browser geolocation');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Using browser geolocation');
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (error) => {
              console.log('All location methods failed, using default');
              setUserLocation({ lat: 29.4241, lng: -98.4936 });
            }
          );
        } else {
          console.log('No location method available, using default');
          setUserLocation({ lat: 29.4241, lng: -98.4936 });
        }
      }
    });
  }, []);

  // Calculate distances for suggestions
  const calculateDistances = async (markets: FarmersMarket[]) => {
    if (!userLocation || markets.length === 0) return;
    
    setIsLoadingDistances(true);
    const distances: Record<string, string> = {};
    
    for (const market of markets) {
      if (!market.geometry?.location) {
        distances[market.place_id] = '-- mi';
        continue;
      }
      
      try {
        const googleDistance = await getGoogleMapsDistance(
          userLocation.lat,
          userLocation.lng,
          market.geometry.location.lat,
          market.geometry.location.lng
        );
        
        if (googleDistance) {
          const displayText = googleDistance.duration 
            ? `${googleDistance.distance} (${googleDistance.duration})`
            : googleDistance.distance;
          distances[market.place_id] = displayText;
        } else {
          distances[market.place_id] = '-- mi';
        }
      } catch (error) {
        console.error('Error calculating distance for market:', market.name, error);
        distances[market.place_id] = '-- mi';
      }
    }
    
    setMarketDistances(distances);
    setIsLoadingDistances(false);
  };

  // Search for farmers markets with debouncing
  useEffect(() => {
    console.log('useEffect triggered with searchQuery:', searchQuery, 'isBadgeClick:', isBadgeClick);
    
    const searchFarmersMarkets = async () => {
      console.log('searchFarmersMarkets called with query:', searchQuery);
      
      if (!searchQuery.trim() || searchQuery.length < 2 || isBadgeClick) {
        console.log('Skipping search - query too short or badge click');
        if (!isBadgeClick) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
        return;
      }

      console.log('Proceeding with search for:', searchQuery);
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

        // Deduplicate suggestions by place_id and name+address combination
        const rawSuggestions = data.predictions || [];
        const uniqueSuggestions = rawSuggestions.filter((suggestion: FarmersMarket, index: number, self: FarmersMarket[]) => 
          index === self.findIndex((s) => 
            s.place_id === suggestion.place_id || 
            (s.name === suggestion.name && s.address === suggestion.address)
          )
        );
        
        // Sort suggestions to prioritize exact matches
        const sortedSuggestions = uniqueSuggestions.sort((a: FarmersMarket, b: FarmersMarket) => {
          const aName = (a.structured_formatting?.main_text || a.name).toLowerCase();
          const bName = (b.structured_formatting?.main_text || b.name).toLowerCase();
          const query = searchQuery.toLowerCase();
          
          // Exact matches first
          const aExact = aName === query;
          const bExact = bName === query;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          // Starts with query next
          const aStarts = aName.startsWith(query);
          const bStarts = bName.startsWith(query);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          
          // Contains query last
          const aContains = aName.includes(query);
          const bContains = bName.includes(query);
          if (aContains && !bContains) return -1;
          if (!aContains && bContains) return 1;
          
          return 0;
        });
        
        setSuggestions(sortedSuggestions);
        setShowSuggestions(true);
        
        // Calculate distances for the new suggestions
        calculateDistances(sortedSuggestions);
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
    // Enhanced duplicate check: compare by place_id OR by name (case-insensitive)
    const isAlreadySelected = selectedMarkets.some(selected => {
      // Direct place_id match
      if (selected.place_id === market.place_id) return true;
      
      // Name match (case-insensitive) - handles saved vs new market scenarios
      const selectedName = (selected.structured_formatting?.main_text || selected.name).toLowerCase().trim();
      const marketName = (market.structured_formatting?.main_text || market.name).toLowerCase().trim();
      
      return selectedName === marketName;
    });
    
    if (isAlreadySelected) {
      console.log('Market already selected (duplicate detected):', market.name);
      setSearchQuery(''); // Clear search
      setShowSuggestions(false);
      return;
    }
    
    // Check if we've reached the maximum
    if (selectedMarkets.length >= maxMarkets) return;
    
    console.log('Selected market:', market.name, 'place_id:', market.place_id);
    onMarketsChange([...selectedMarkets, market]);
    setSearchQuery(''); // Clear search after selection
    setShowSuggestions(false);
  };

  const removeMarket = (marketToRemove: FarmersMarket) => {
    onMarketsChange(selectedMarkets.filter(market => market.place_id !== marketToRemove.place_id));
  };

  const handleMarketBadgeClick = async (market: FarmersMarket) => {
    // Always allow viewing market details, regardless of editing state
    
    // Set badge click flag to prevent search from overriding
    setIsBadgeClick(true);
    
    // Populate search with market name
    const marketName = market.structured_formatting?.main_text || market.name;
    setSearchQuery(marketName);
    
    // If market doesn't have detailed info, search for it to get full details
    if (!market.opening_hours || !market.rating) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('farmers-market-search', {
          body: {
            query: marketName,
            location: userLocation
          }
        });

        if (!error && data.predictions?.length > 0) {
          // Find the exact market match
          const detailedMarket = data.predictions.find((p: FarmersMarket) => 
            p.place_id === market.place_id || 
            (p.structured_formatting?.main_text || p.name).toLowerCase() === marketName.toLowerCase()
          ) || data.predictions[0];
          
          setSuggestions([detailedMarket]);
          calculateDistances([detailedMarket]);
        } else {
          setSuggestions([market]);
          calculateDistances([market]);
        }
      } catch (error) {
        console.error('Error fetching market details:', error);
        setSuggestions([market]);
        calculateDistances([market]);
      } finally {
        setLoading(false);
      }
    } else {
      // Market already has details, show it directly
      setSuggestions([market]);
      calculateDistances([market]);
    }
    
    setShowSuggestions(true);
    
    // Focus the input
    inputRef.current?.focus();
  };

  // Filter out already selected markets from suggestions with name-based deduplication
  const filteredSuggestions = suggestions.filter(suggestion => {
    return !selectedMarkets.some(selected => {
      // Direct place_id match
      if (selected.place_id === suggestion.place_id) return true;
      
      // Name match (case-insensitive) - handles saved vs new market scenarios  
      const selectedName = (selected.structured_formatting?.main_text || selected.name).toLowerCase().trim();
      const suggestionName = (suggestion.structured_formatting?.main_text || suggestion.name).toLowerCase().trim();
      
      return selectedName === suggestionName;
    });
  });

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
              setIsBadgeClick(false);
              setSearchQuery(e.target.value);
            }}
            onFocus={() => suggestions.length > 0 && isEditing && setShowSuggestions(true)}
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
            {(searchQuery ? suggestions : filteredSuggestions).length === 0 && !loading ? (
              <div className="p-4 text-center text-muted-foreground">
                No farmers markets found for "{searchQuery}". Try a different search term.
              </div>
            ) : (searchQuery ? suggestions : filteredSuggestions).map((market) => (
              <div
                key={market.place_id}
                className="flex items-start p-4 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                onClick={() => handleSuggestionClick(market)}
              >
                <MapPin className="h-5 w-5 text-muted-foreground mr-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="font-semibold text-foreground text-base">
                    {market.structured_formatting?.main_text || market.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{market.structured_formatting?.secondary_text || market.address}</span>
                    </div>
                  </div>
                  
                  {/* Distance Display */}
                  {marketDistances[market.place_id] && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      <span>{marketDistances[market.place_id]}</span>
                    </div>
                  )}
                  {isLoadingDistances && !marketDistances[market.place_id] && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      <span>Calculating distance...</span>
                    </div>
                  )}
                  {market.opening_hours?.weekday_text && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium mb-1">Hours:</div>
                          <div className="space-y-0.5">
                            {market.opening_hours.weekday_text.slice(0, 3).map((hours, idx) => (
                              <div key={idx} className="text-xs">{hours}</div>
                            ))}
                            {market.opening_hours.weekday_text.length > 3 && (
                              <div className="text-xs text-muted-foreground/70">
                                +{market.opening_hours.weekday_text.length - 3} more days
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {market.rating && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>⭐ {market.rating.toFixed(1)}</span>
                        {market.user_ratings_total && (
                          <span className="text-xs">({market.user_ratings_total} reviews)</span>
                        )}
                      </div>
                    </div>
                  )}
                  {market.structured_formatting?.secondary_text && (
                    <Button
                      variant="outline" 
                      size="sm"
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(market.structured_formatting?.secondary_text || market.address);
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View on Map
                    </Button>
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