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

          // Apply styles to fix z-index and interaction issues
          const addGlobalStyles = () => {
            // Remove existing styles if any
            const existingStyle = document.getElementById('google-places-styles');
            if (existingStyle) {
              existingStyle.remove();
            }

            const style = document.createElement('style');
            style.id = 'google-places-styles';
            style.innerHTML = `
              .pac-container {
                z-index: 999999 !important;
                background: white !important;
                border: 1px solid hsl(var(--border)) !important;
                border-radius: 6px !important;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
                margin-top: 2px !important;
                position: absolute !important;
                overflow: visible !important;
              }
              .pac-item {
                padding: 8px 12px !important;
                cursor: pointer !important;
                border-bottom: 1px solid hsl(var(--border)) !important;
                color: hsl(var(--foreground)) !important;
                font-size: 14px !important;
                line-height: 1.5 !important;
                pointer-events: auto !important;
              }
              .pac-item:last-child {
                border-bottom: none !important;
              }
              .pac-item:hover, .pac-item-selected {
                background-color: hsl(var(--muted)) !important;
              }
              .pac-item-query {
                font-weight: 500 !important;
              }
              .pac-matched {
                font-weight: 600 !important;
                color: hsl(var(--primary)) !important;
              }
            `;
            document.head.appendChild(style);
          };

          // Add styles immediately and also with a delay
          addGlobalStyles();
          setTimeout(addGlobalStyles, 100);
          setTimeout(addGlobalStyles, 500);
        }
        
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading Google Places API:', error);
      }
    };

    if (!isLoaded) {
      initializeAutocomplete();
    }
  }, [isLoaded, onChange, onPlaceSelected]);

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <Input
        ref={inputRef}
        id={id}
        name={`address-field-${id || 'unique'}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        autoComplete="new-address"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-form-type="other"
        data-lpignore="true"
        required={required}
      />
    </div>
  );
};