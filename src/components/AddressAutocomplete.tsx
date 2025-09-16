import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
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
  const elementRef = useRef<HTMLElement | null>(null);
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
        
        if (!elementRef.current) {
          // Create the new PlaceAutocompleteElement
          const placeAutocomplete = document.createElement('gmp-place-autocomplete') as any;
          
          // Set attributes
          placeAutocomplete.setAttribute('type', 'address');
          placeAutocomplete.setAttribute('country-restriction', 'us');
          if (placeholder) {
            placeAutocomplete.setAttribute('placeholder', placeholder);
          }
          if (required) {
            placeAutocomplete.setAttribute('required', 'true');
          }
          if (id) {
            placeAutocomplete.setAttribute('id', id);
          }
          if (className) {
            placeAutocomplete.className = className;
          }

          // Set the value
          if (value) {
            placeAutocomplete.value = value;
          }

          // Add event listeners
          placeAutocomplete.addEventListener('gmp-placeselect', (event: any) => {
            const place = event.detail.place;
            console.log('Place selected event:', place);
            
            if (place && place.addressComponents) {
              let streetNumber = '';
              let streetName = '';
              let city = '';
              let state = '';
              
              place.addressComponents.forEach((component: any) => {
                const types = component.types;
                
                if (types.includes('street_number')) {
                  streetNumber = component.longText;
                }
                if (types.includes('route')) {
                  streetName = component.longText;
                }
                if (types.includes('locality')) {
                  city = component.longText;
                }
                if (types.includes('administrative_area_level_1')) {
                  state = component.shortText;
                }
              });
              
              const fullAddress = `${streetNumber} ${streetName}`.trim();
              console.log('Full address extracted:', fullAddress);
              
              // Update the form immediately
              onChange(fullAddress);
              
              if (onPlaceSelected) {
                onPlaceSelected({
                  address: fullAddress,
                  city,
                  state
                });
              }
            } else if (place && place.displayName) {
              // Fallback: use display name if address components aren't available
              const displayAddress = place.displayName;
              console.log('Using display name as address:', displayAddress);
              onChange(displayAddress);
              
              if (onPlaceSelected) {
                onPlaceSelected({
                  address: displayAddress,
                  city: '',
                  state: ''
                });
              }
            }
          });

          // Handle input changes - multiple event types for Google Places
          const handleInputChange = () => {
            // Try multiple ways to get the current input value
            const inputElement = placeAutocomplete.querySelector('input');
            let inputValue = '';
            
            if (inputElement) {
              inputValue = inputElement.value || '';
            } else {
              inputValue = placeAutocomplete.value || '';
            }
            
            console.log('Input value captured:', inputValue);
            
            // Ensure we always pass a string
            const stringValue = typeof inputValue === 'string' ? inputValue : String(inputValue || '');
            console.log('Final string value being sent:', stringValue);
            onChange(stringValue);
          };

          // Listen to multiple input events
          placeAutocomplete.addEventListener('input', handleInputChange);
          placeAutocomplete.addEventListener('keyup', handleInputChange);
          placeAutocomplete.addEventListener('change', handleInputChange);
          
          // Also listen to the inner input element if it exists
          const checkForInnerInput = () => {
            const inputElement = placeAutocomplete.querySelector('input');
            if (inputElement) {
              inputElement.addEventListener('input', handleInputChange);
              inputElement.addEventListener('keyup', handleInputChange);
              inputElement.addEventListener('change', handleInputChange);
            } else {
              // If input doesn't exist yet, try again shortly
              setTimeout(checkForInnerInput, 100);
            }
          };
          
          checkForInnerInput();

          // Handle focus/blur for modal compatibility
          placeAutocomplete.addEventListener('focus', () => {
            onGooglePlacesActiveChange?.(true);
          });

          placeAutocomplete.addEventListener('blur', () => {
            setTimeout(() => {
              onGooglePlacesActiveChange?.(false);
            }, 100);
          });

          // Apply custom styles
          const style = document.createElement('style');
          style.innerHTML = `
            gmp-place-autocomplete {
              width: 100%;
            }
            gmp-place-autocomplete input {
              width: 100% !important;
              padding: 8px 12px !important;
              border: 1px solid #d1d5db !important;
              border-radius: 6px !important;
              background-color: white !important;
              color: black !important;
              font-size: 14px !important;
              line-height: 1.5 !important;
              transition: border-color 0.2s !important;
            }
            gmp-place-autocomplete input:focus {
              outline: none !important;
              border-color: #3b82f6 !important;
              box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
            }
            gmp-place-autocomplete input::placeholder {
              color: #6b7280 !important;
            }
            /* Additional overrides for Google Places suggestions */
            .pac-container {
              background-color: white !important;
              border: 1px solid #d1d5db !important;
              border-radius: 6px !important;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
            }
            .pac-item {
              background-color: white !important;
              color: black !important;
              border-bottom: 1px solid #f3f4f6 !important;
            }
            .pac-item:hover {
              background-color: #f9fafb !important;
            }
            .pac-item-selected {
              background-color: #f3f4f6 !important;
            }
            .pac-matched {
              color: #1f2937 !important;
              font-weight: 600 !important;
            }
            .gm-style .gm-style-iw-c {
              z-index: 999999 !important;
            }
          `;
          
          if (!document.getElementById('gmp-place-autocomplete-styles')) {
            style.id = 'gmp-place-autocomplete-styles';
            document.head.appendChild(style);
          }

          elementRef.current = placeAutocomplete;
        }
        
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading Google Places API:', error);
      }
    };

    if (!isLoaded) {
      initializeAutocomplete();
    }
  }, [isLoaded, onChange, onPlaceSelected, onGooglePlacesActiveChange, value, placeholder, className, id, required]);

  // Update value when prop changes
  useEffect(() => {
    if (elementRef.current && (elementRef.current as any).value !== value) {
      (elementRef.current as any).value = value;
    }
  }, [value]);

  return (
    <div 
      style={{ position: 'relative', zIndex: 1 }}
      ref={(containerRef) => {
        if (containerRef && elementRef.current && !containerRef.contains(elementRef.current)) {
          containerRef.appendChild(elementRef.current);
        }
      }}
    />
  );
};