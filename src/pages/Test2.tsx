import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Test2() {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedLocation.trim()) {
      toast({
        title: "Error",
        description: "Please select a location first",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save locations",
          variant: "destructive",
        });
        return;
      }

      // Parse the location to extract components
      const locationParts = selectedLocation.split(', ');
      let city = '';
      let state = '';
      
      if (locationParts.length >= 2) {
        state = locationParts[locationParts.length - 1];
        city = locationParts[locationParts.length - 2];
      }

      // Save to markets table (reusing existing table structure)
      const { data, error } = await supabase
        .from('markets')
        .insert({
          name: `Location - ${new Date().toLocaleString()}`,
          address: selectedLocation,
          city: city || 'Unknown',
          state: state || 'Unknown',
          days: ['Monday'], // Default value since it's required
          hours: ''
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving location:', error);
        toast({
          title: "Error",
          description: "Failed to save location. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Location saved successfully:', data);
      
      toast({
        title: "Success!",
        description: `Location "${selectedLocation}" has been saved successfully.`,
      });
      
      // Clear the form
      setSelectedLocation('');
      
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8 text-center">
            Location Search
          </h1>
          
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <div className="space-y-6">
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
                
                {/* Info Box */}
                <div className="mt-4 p-4 bg-muted/50 border border-border rounded-lg">
                  <h3 className="font-medium text-foreground mb-2">
                    Current Input:
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedLocation || 'No location entered yet...'}
                  </p>
                </div>
                
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

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  onClick={handleSubmit}
                  disabled={!selectedLocation.trim() || isSubmitting}
                  className="w-full py-3 text-base font-medium"
                  size="lg"
                >
                  {isSubmitting ? 'Saving...' : 'Submit Location'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}