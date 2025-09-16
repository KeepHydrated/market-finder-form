import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

export default function Test2() {
  const [selectedLocation, setSelectedLocation] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8 text-center">
            Location Search
          </h1>
          
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <div className="space-y-4">
              <Label htmlFor="location-search" className="text-lg font-medium">
                Search for a Location
              </Label>
              <p className="text-sm text-muted-foreground">
                Start typing an address and select from Google's suggestions
              </p>
              
              <AddressAutocomplete
                value={selectedLocation}
                onChange={(value) => {
                  console.log('Location selected:', value);
                  setSelectedLocation(value);
                }}
                onPlaceSelected={(place) => {
                  console.log('Place details:', place);
                  setSelectedLocation(place.address);
                }}
                placeholder="Type an address, city, or landmark..."
                className="w-full text-base py-3 px-4 border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="location-search"
              />
              
              {selectedLocation && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
                    Selected Location:
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    {selectedLocation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}