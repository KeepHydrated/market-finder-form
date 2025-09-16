import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';

/// <reference types="google.maps" />

// Extend the Window interface to include our custom property
declare global {
  interface Window {
    gmpShadowPatched?: boolean;
  }
}

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
        // Setup Shadow DOM patching before loading Google Maps
        if (!window.gmpShadowPatched) {
          const originalAttachShadow = Element.prototype.attachShadow;
          
          Element.prototype.attachShadow = function (init) {
            if (this.localName === "gmp-place-autocomplete") {
              // Force shadow DOM to be open so we can style it
              const shadow = originalAttachShadow.call(this, {
                ...init,
                mode: "open"
              });

              const style = document.createElement("style");
              style.textContent = `
                /* Style the input container to match desired appearance */
                .input-container {
                  border: 1px solid #d1d5db !important;
                  border-radius: 6px !important;
                  background-color: white !important;
                  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out !important;
                }

                /* Focus state for the container */
                .input-container:focus-within {
                  border-color: #3b82f6 !important;
                  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
                }

                /* Style the input itself */
                input {
                  border: none !important;
                  outline: none !important;
                  font-size: 14px !important;
                  font-family: inherit !important;
                  line-height: 1.5 !important;
                  background: transparent !important;
                  color: black !important;
                  padding: 8px 12px !important;
                  padding-left: 40px !important;
                  padding-right: 40px !important;
                }

                input::placeholder {
                  color: #6b7280 !important;
                }

                /* Hide Google's default focus ring */
                .focus-ring {
                  display: none !important;
                }

                /* Ensure icons stay in correct position */
                .autocomplete-icon {
                  position: absolute !important;
                  left: 12px !important;
                  top: 50% !important;
                  transform: translateY(-50%) !important;
                  z-index: 1 !important;
                }

                .clear-button {
                  position: absolute !important;
                  right: 12px !important;
                  top: 50% !important;
                  transform: translateY(-50%) !important;
                  z-index: 1 !important;
                  background: none !important;
                  border: none !important;
                  cursor: pointer !important;
                }

                /* Style the dropdown/suggestions container */
                .dropdown {
                  background-color: white !important;
                  border: 1px solid #d1d5db !important;
                  border-radius: 6px !important;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                  overflow: hidden !important;
                }

                /* Style individual prediction items */
                .prediction {
                  background-color: white !important;
                  color: black !important;
                  border-bottom: 1px solid #f3f4f6 !important;
                  padding: 12px 16px !important;
                  cursor: pointer !important;
                }

                .prediction:hover {
                  background-color: #f9fafb !important;
                }

                .prediction:last-child {
                  border-bottom: none !important;
                }

                /* Style the prediction text */
                .prediction .main-text {
                  color: black !important;
                  font-weight: 500 !important;
                }

                .prediction .secondary-text {
                  color: #6b7280 !important;
                  font-size: 14px !important;
                }

                /* Additional fallback styles for any dark elements */
                [class*="dark"], [class*="black"] {
                  background-color: white !important;
                  color: black !important;
                }
              `;

              shadow.appendChild(style);
              return shadow;
            }
            return originalAttachShadow.call(this, init);
          };

          window.gmpShadowPatched = true;
        }

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

          // Handle input changes
          placeAutocomplete.addEventListener('input', (event: any) => {
            onChange(event.target.value);
          });

          // Handle focus/blur for modal compatibility
          placeAutocomplete.addEventListener('focus', () => {
            onGooglePlacesActiveChange?.(true);
          });

          placeAutocomplete.addEventListener('blur', () => {
            setTimeout(() => {
              onGooglePlacesActiveChange?.(false);
            }, 100);
          });

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