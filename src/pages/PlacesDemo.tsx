import React, { useState } from 'react';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function PlacesDemo() {
  const [selectedAddress, setSelectedAddress] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<{
    address: string;
    city: string;
    state: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handlePlaceSelected = (place: { address: string; city: string; state: string }) => {
    console.log('Place selected:', place);
    setSelectedPlace(place);
    toast({
      title: "Place Selected!",
      description: `Selected: ${place.address}`,
    });
  };

  const handleSave = async () => {
    if (!selectedPlace) {
      toast({
        title: "Error",
        description: "No place selected to save",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save places",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from('markets')
        .insert({
          name: `Location at ${selectedPlace.city}`,
          address: selectedPlace.address,
          city: selectedPlace.city,
          state: selectedPlace.state,
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] // Default days
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving place:', error);
        toast({
          title: "Error",
          description: "Failed to save the place. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Place saved successfully:', data);
      toast({
        title: "Success!",
        description: `Saved "${selectedPlace.address}" to your locations`,
      });

      // Clear the form after successful save
      handleClear();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setSelectedAddress('');
    setManualAddress('');
    setSelectedPlace(null);
    toast({
      title: "Cleared",
      description: "All fields have been cleared.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Google Places Demo</h1>
          <p className="text-muted-foreground">
            Test the Google Places autocomplete functionality
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Address Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Manual Input */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Manual Address Entry:</Label>
                <Input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Type full address manually..."
                  className="text-base py-3"
                />
              </div>

              {/* Google Places Autocomplete */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Google Places Autocomplete:</Label>
                <AddressAutocomplete
                  value={selectedAddress}
                  onChange={(value) => {
                    console.log('AddressAutocomplete onChange:', value);
                    setSelectedAddress(value || '');
                  }}
                  onPlaceSelected={handlePlaceSelected}
                  placeholder="Start typing a location..."
                  className="text-base py-3"
                />
              </div>

              {/* Current Input Display */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Current Input:</Label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {selectedAddress || manualAddress || 'No input yet...'}
                </div>
                {/* Debug info */}
                <div className="text-xs text-muted-foreground">
                  Debug: selectedAddress="{selectedAddress}", manualAddress="{manualAddress}", selectedPlace={selectedPlace ? 'exists' : 'null'}
                </div>
              </div>

              <Button onClick={handleClear} variant="outline" className="w-full">
                Clear All
              </Button>
              
              {/* Always visible test button */}
              <Button 
                onClick={() => {
                  const testPlace = {
                    address: "Test Address, Test City, TX",
                    city: "Test City",
                    state: "TX"
                  };
                  setSelectedPlace(testPlace);
                  toast({
                    title: "Test Place Created",
                    description: "Created a test place for debugging",
                  });
                }}
                variant="destructive" 
                className="w-full"
              >
                TEST: Create Test Place
              </Button>
              
              {/* Temporary save button for manual input */}
              {(selectedAddress || manualAddress) && !selectedPlace && (
                <Button 
                  onClick={() => {
                    const inputText = selectedAddress || manualAddress;
                    const parts = inputText.split(', ');
                    const mockPlace = {
                      address: inputText,
                      city: parts.length > 1 ? parts[parts.length - 2] : 'Unknown',
                      state: parts.length > 0 ? parts[parts.length - 1] : 'Unknown'
                    };
                    setSelectedPlace(mockPlace);
                    toast({
                      title: "Manual Input Converted",
                      description: `Created place from: ${inputText}`,
                    });
                  }}
                  variant="secondary" 
                  className="w-full"
                >
                  Convert to Place (for testing)
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPlace ? (
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">✅ Place Selected!</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Full Address:</span>
                        <p className="text-green-700">{selectedPlace.address}</p>
                      </div>
                      <div>
                        <span className="font-medium">City:</span>
                        <p className="text-green-700">{selectedPlace.city}</p>
                      </div>
                      <div>
                        <span className="font-medium">State:</span>
                        <p className="text-green-700">{selectedPlace.state}</p>
                      </div>
                    </div>
                    
                    {/* Save Button */}
                    <div className="mt-4 pt-3 border-t border-green-200">
                      <Button 
                        onClick={handleSave}
                        disabled={isSaving || !user}
                        className="w-full"
                      >
                        {isSaving ? 'Saving...' : 'Save to Database'}
                      </Button>
                      {!user && (
                        <p className="text-xs text-green-600 mt-2 text-center">
                          Please log in to save places
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted/50 border border-dashed rounded-lg text-center">
                  <p className="text-muted-foreground">
                    Use the Google Places autocomplete above to select a location
                  </p>
                </div>
              )}

              {(selectedAddress || manualAddress) && !selectedPlace && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Typing in Progress</h3>
                  <div className="text-sm">
                    <span className="font-medium">Current Input:</span>
                    <p className="text-blue-700">{selectedAddress || manualAddress}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-primary">1.</span>
                <p>Try typing in the <strong>Google Places Autocomplete</strong> field - start with a location like "New York" or "1600 Pennsylvania Avenue"</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-primary">2.</span>
                <p>Select a suggestion from the dropdown to see the parsed address details</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-primary">3.</span>
                <p>Compare with the <strong>Manual Address Entry</strong> field to see the difference</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-primary">4.</span>
                <p>Watch the <strong>Current Input</strong> box update in real-time as you type</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}