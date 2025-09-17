import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Building2, Landmark, Store, UtensilsCrossed, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Types for location suggestions
interface LocationSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

interface LocationInputProps {
  placeholder?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: LocationSuggestion) => void;
  zipcode?: string;
  className?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  placeholder = "Enter location",
  label = "Location",
  value,
  onChange,
  onLocationSelect,
  zipcode,
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get appropriate icon for location type
  const getLocationIcon = (types: string[]) => {
    if (types.includes('establishment') || types.includes('point_of_interest')) {
      if (types.includes('restaurant') || types.includes('food')) {
        return UtensilsCrossed;
      }
      if (types.includes('store') || types.includes('shopping_mall')) {
        return Store;
      }
      if (types.includes('school') || types.includes('university')) {
        return Building2;
      }
      return Landmark;
    }
    if (types.includes('route') || types.includes('street_address')) {
      return Car;
    }
    return MapPin;
  };

  // Fetch location suggestions
  const fetchLocationSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('places-autocomplete', {
        body: { query, zipcode }
      });

      if (error) {
        console.error('Error fetching suggestions:', error);
        return;
      }

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value) {
        fetchLocationSuggestions(value);
      } else {
        setSuggestions([]);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [value, zipcode]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setIsOpen(true);
  };

  const selectLocation = (location: LocationSuggestion) => {
    onChange(location.description);
    setIsOpen(false);
    onLocationSelect?.(location);
  };

  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-base font-bold text-foreground">
          {label}
        </label>
      )}
      
      <div className="relative -mt-2.5">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 text-base border border-border rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground placeholder:text-muted-foreground"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
          />
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        
        {/* Suggestions dropdown */}
        {isOpen && (suggestions.length > 0 || value.length > 0) && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto"
          >
            {isLoading && value.length > 0 && (
              <div className="px-4 py-3 text-muted-foreground text-center">
                Searching...
              </div>
            )}
            
            {!isLoading && suggestions.length === 0 && value.length > 0 && (
              <div className="px-4 py-3 text-muted-foreground text-center">
                No locations found
              </div>
            )}
            
            {suggestions.map((item) => {
              const IconComponent = getLocationIcon(item.types);
              return (
                <div
                  key={item.place_id}
                  className="flex items-center px-4 py-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                  onClick={() => selectLocation(item)}
                >
                  <IconComponent className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {item.structured_formatting.main_text}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.structured_formatting.secondary_text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationInput;