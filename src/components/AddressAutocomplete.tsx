import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';
import './AddressAutocomplete.css';

/// <reference types="google.maps" />

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string, isFromGooglePlaces: boolean, city?: string, state?: string) => void;
  onPlaceSelected?: (place: { address: string; city: string; state: string; }) => void;
  onGooglePlacesActiveChange?: (isActive: boolean) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  onPlaceSelected,
  onGooglePlacesActiveChange,
  placeholder = "Start typing an address...",
  className,
  id,
  required
}: AddressAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initializeAutocomplete = async () => {
      try {
        // Fetch API key from edge function
        const { data, error } = await supabase.functions.invoke('get-google-api-key');

        if (error || !data?.apiKey) {
          console.error('Failed to get Google API key:', error);
          return;
        }

        const loader = new Loader({
          apiKey: data.apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        console.log('✅ Google Maps API loaded successfully');
        console.log('Google Maps object available:', !!window.google);
        console.log('Google Maps Places available:', !!(window.google && window.google.maps && window.google.maps.places));

        if (inputRef.current && !autocompleteRef.current) {
          console.log('🔧 Creating Google Places Autocomplete...');
          console.log('Input element exists:', !!inputRef.current);
          console.log('Input element:', inputRef.current);

          // Create the traditional Google Places Autocomplete
          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
            // Removed country restriction for global addresses
          });

          console.log('✅ Google Places Autocomplete created');
          console.log('Autocomplete object:', autocomplete);
          console.log('Input element after autocomplete creation:', inputRef.current);

          // Handle place selection
          autocomplete.addListener('place_changed', () => {
            console.log('=== GOOGLE PLACES SELECTION EVENT FIRED ===');
            console.log('Current input value before selection:', inputRef.current?.value);

            const place = autocomplete.getPlace();
            console.log('Place selected:', place);
            console.log('Place object keys:', Object.keys(place));
            console.log('Place formatted_address:', place.formatted_address);

            if (!place || !place.formatted_address) {
              console.log('❌ No valid place data received');
              return;
            }

            const selectedAddress = place.formatted_address;
            console.log('Selected address:', selectedAddress);

            // Update the input value
            if (inputRef.current) {
              inputRef.current.value = selectedAddress;
            }

            // Extract city and state
            let city = '';
            let state = '';

            if (place.address_components) {
              for (const component of place.address_components) {
                if (component.types.includes('locality')) {
                  city = component.long_name;
                }
                if (component.types.includes('administrative_area_level_1')) {
                  state = component.short_name;
                }
              }
            }

            console.log('Extracted city:', city);
            console.log('Extracted state:', state);

            // Update form state with Google Places data
            onChange(selectedAddress, true, city, state);
            console.log('Called onChange with Google Places data:', { selectedAddress, city, state });

            // Also call onPlaceSelected if provided
            if (onPlaceSelected) {
              onPlaceSelected({ address: selectedAddress, city, state });
            }

            console.log('=== END GOOGLE PLACES SELECTION ===');
          });

          autocompleteRef.current = autocomplete;
          setIsLoaded(true);
          console.log('✅ Google Places autocomplete fully initialized!');
        }
      } catch (error) {
        console.error('Error loading Google Places API:', error);
      }
    };

    initializeAutocomplete();
  }, [onChange]);

  // Handle input changes (manual typing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    console.log('Manual input change:', inputValue);

    // Check if Google Places suggestions are showing
    setTimeout(() => {
      const pacContainer = document.querySelector('.pac-container') as HTMLElement;
      if (pacContainer) {
        console.log('PAC container visible after input:', pacContainer.style.display !== 'none');
        const pacItems = pacContainer.querySelectorAll('.pac-item');
        console.log('Number of suggestions:', pacItems.length);
      }
    }, 100);

    onChange(inputValue, false);
  };

  // Handle focus/blur for modal compatibility
  const handleFocus = () => {
    console.log('Input focused - checking for Google Places dropdown');
    // Check if pac-container exists after a short delay
    setTimeout(() => {
      const pacContainer = document.querySelector('.pac-container') as HTMLElement;
      console.log('PAC container found:', pacContainer);
      if (pacContainer) {
        console.log('PAC container is visible:', pacContainer.style.display !== 'none');
        console.log('PAC container z-index:', pacContainer.style.zIndex);
        console.log('PAC container position:', pacContainer.style.position);
      }
    }, 100);

    if (onGooglePlacesActiveChange) {
      onGooglePlacesActiveChange(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow place selection to complete
    setTimeout(() => {
      if (onGooglePlacesActiveChange) {
        onGooglePlacesActiveChange(false);
      }
    }, 200);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      id={id}
      className={`address-autocomplete-input ${className || ''}`}
      placeholder={placeholder}
      defaultValue={value}
      onChange={handleInputChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      required={required}
      autoComplete="off"
    />
  );
};