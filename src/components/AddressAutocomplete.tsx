import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

/// <reference types="google.maps" />

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (place: {
    address: string;
    city: string;
    state: string;
  }) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  onPlaceSelected,
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
        setIsLoaded(true);

        if (inputRef.current && !autocompleteRef.current) {
          autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'us' }
          });

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            
            if (place && place.address_components) {
              const addressComponents = place.address_components;
              
              let streetNumber = '';
              let streetName = '';
              let city = '';
              let state = '';
              
              addressComponents.forEach(component => {
                const types = component.types;
                
                if (types.includes('street_number')) {
                  streetNumber = component.long_name;
                }
                if (types.includes('route')) {
                  streetName = component.long_name;
                }
                if (types.includes('locality')) {
                  city = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                  state = component.short_name;
                }
              });
              
              const fullAddress = `${streetNumber} ${streetName}`.trim();
              
              onChange(fullAddress);
              
              if (onPlaceSelected) {
                onPlaceSelected({
                  address: fullAddress,
                  city,
                  state
                });
              }
            }
          });
        }
      } catch (error) {
        console.error('Error loading Google Places API:', error);
      }
    };

    if (!isLoaded) {
      initializeAutocomplete();
    }
  }, [isLoaded, onChange, onPlaceSelected]);

  return (
    <Input
      ref={inputRef}
      id={id}
      name="address-field-unique"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="nope"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-form-type="other"
      data-lpignore="true"
      style={{ WebkitAppearance: 'none' } as React.CSSProperties}
      required={required}
    />
  );
};