import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete } from './AddressAutocomplete';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const timeOptions = [
  '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'
];

interface AddMarketFormProps {
  open: boolean;
  onClose: () => void;
  onMarketAdded: (market: any) => void;
}

export const AddMarketForm = ({ open, onClose, onMarketAdded }: AddMarketFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    days: [] as string[],
    hours: {} as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
  });

  // Separate state for Google Places selection
  const [googlePlacesData, setGooglePlacesData] = useState<{
    address: string;
    city: string;
    state: string;
    isSelected: boolean;
  }>({
    address: '',
    city: '',
    state: '',
    isSelected: false
  });

  const [dayTimeSelections, setDayTimeSelections] = useState<Record<string, {
    startTime: string;
    startPeriod: 'AM' | 'PM';
    endTime: string;
    endPeriod: 'AM' | 'PM';
  }>>({});

  const updateTimeSelection = (day: string, field: string, value: string) => {
    setDayTimeSelections(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));

    // Update formData hours
    const updatedSelection = { ...dayTimeSelections[day], [field]: value };
    setFormData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          start: updatedSelection.startTime || '08:00',
          end: updatedSelection.endTime || '02:00',
          startPeriod: updatedSelection.startPeriod || 'AM',
          endPeriod: updatedSelection.endPeriod || 'PM'
        }
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prioritize Google Places selection over manual entry
    const effectiveAddress = googlePlacesData.isSelected ? googlePlacesData.address : formData.address;
    const addressString = typeof effectiveAddress === 'string' ? effectiveAddress.trim() : '';
    const name = formData.name.trim();
    
    console.log('🔍 Form validation check:');
    console.log('  - Name:', `"${name}"`);
    console.log('  - Google Places Selected:', googlePlacesData.isSelected);
    console.log('  - Google Places Address:', `"${googlePlacesData.address}"`);
    console.log('  - Manual Address:', `"${formData.address}"`);
    console.log('  - Effective Address:', `"${addressString}"`);
    console.log('  - Days:', formData.days);
    
    // Enhanced validation with specific error messages
    const missingFields = [];
    if (!name) missingFields.push('Market name');
    if (!addressString) missingFields.push('Address');
    if (formData.days.length === 0) missingFields.push('Operating days');
    
    if (missingFields.length > 0) {
      console.log('❌ Validation failed - Missing:', missingFields);
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    console.log('✅ Validation passed - submitting form');

    // Format hours object into readable string
    const formatHours = () => {
      if (!formData.hours || Object.keys(formData.hours).length === 0) {
        return null;
      }
      
      const dayAbbrevMap: Record<string, string> = {
        'Monday': 'Mon',
        'Tuesday': 'Tue', 
        'Wednesday': 'Wed',
        'Thursday': 'Thu',
        'Friday': 'Fri',
        'Saturday': 'Sat',
        'Sunday': 'Sun'
      };
      
      const hoursArray = formData.days
        .filter(day => formData.hours[day])
        .map(day => {
          const timeData = formData.hours[day];
          const dayAbbrev = dayAbbrevMap[day] || day.slice(0, 3);
          return `${dayAbbrev}: ${timeData.start} ${timeData.startPeriod} - ${timeData.end} ${timeData.endPeriod}`;
        });
      
      return hoursArray.join(', ');
    };

    // Convert days to 3-letter abbreviations
    const dayAbbrevMap: Record<string, string> = {
      'Monday': 'Mon',
      'Tuesday': 'Tue', 
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat',
      'Sunday': 'Sun'
    };
    
    const formattedDays = formData.days.map(day => dayAbbrevMap[day] || day.slice(0, 3));
    
    // Create clean form data with formatted hours and days
    const cleanFormData = {
      name: name,
      address: addressString, // This now uses the effective address
      days: formattedDays,
      hours: formatHours()
    };
    
    onMarketAdded(cleanFormData);
    
    // Reset form
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      days: [],
      hours: {}
    });
    setGooglePlacesData({
      address: '',
      city: '',
      state: '',
      isSelected: false
    });
    setDayTimeSelections({});
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));

    // Initialize time selection for newly selected day
    if (!formData.days.includes(day)) {
      setDayTimeSelections(prevTimes => ({
        ...prevTimes,
        [day]: {
          startTime: '08:00',
          startPeriod: 'AM',
          endTime: '02:00',
          endPeriod: 'PM'
        }
      }));
    } else {
      // Remove time selection when day is deselected
      setDayTimeSelections(prevTimes => {
        const newTimes = { ...prevTimes };
        delete newTimes[day];
        return newTimes;
      });
    }
  };

  const [isGooglePlacesActive, setIsGooglePlacesActive] = useState(false);

  const handleCloseModal = (open: boolean) => {
    // Don't close if Google Places is active
    if (isGooglePlacesActive) {
      return;
    }
    
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseModal}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          // Check if the interaction is with Google Places elements
          const target = e.target as Element;
          if (target && (
            target.closest('.pac-container') ||
            target.classList.contains('pac-item') ||
            target.classList.contains('pac-item-query') ||
            target.getAttribute('data-google-places') ||
            target.getAttribute('data-google-places-item')
          )) {
            e.preventDefault();
          }
        }}>
        <DialogHeader>
          <DialogTitle>Add New Farmers Market</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Market Name *</Label>
            <Input
              id="name"
              name={`market-name-${Math.random().toString(36).substr(2, 9)}`}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Downtown Farmers Market"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              data-lpignore="true"
              role="textbox"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address-google" className="text-base font-medium">Address *</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Option 1: Use Google Places autocomplete below, OR Option 2: Use the manual input
            </p>
            
            {/* Manual address input as backup */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Manual Address Entry:</Label>
              <Input
                value={typeof formData.address === 'string' ? formData.address : ''}
                onChange={(e) => {
                  console.log('📍 Manual address input:', e.target.value);
                  setFormData(prev => ({ ...prev, address: e.target.value }));
                }}
                placeholder="Type full address manually (e.g., Japanese Tea Garden, North Saint Mary's Street, San Antonio, TX)"
                className="text-base py-3"
              />
            </div>
            
            {/* Google Places Autocomplete */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">OR Google Places Autocomplete:</Label>
              <AddressAutocomplete
                id="address-google"
                value={googlePlacesData.isSelected ? googlePlacesData.address : formData.address}
                onChange={(address) => {
                  console.log('📍 AddressAutocomplete onChange called with:', `"${address}"`);
                  
                  // If we get an empty string but have a Google selection, ignore it
                  if (!address && googlePlacesData.isSelected) {
                    console.log('🚫 Ignoring empty onChange - Google Places selection is active');
                    return;
                  }
                  
                  // When user types manually in Google Places field, clear the "selected" state
                  if (!address) {
                    setGooglePlacesData({
                      address: '',
                      city: '',
                      state: '',
                      isSelected: false
                    });
                  }
                  setFormData(prev => ({ ...prev, address: address || '' }));
                }}
                onPlaceSelected={(place) => {
                  console.log('📍 Place selected from Google Places:', place);
                  if (place && place.address) {
                    // Set Google Places data as selected
                    setGooglePlacesData({
                      address: place.address || '',
                      city: place.city || '',
                      state: place.state || '',
                      isSelected: true
                    });
                    // Also mirror to manual field for visual consistency
                    setFormData(prev => ({
                      ...prev,
                      address: place.address || '',
                      city: place.city || '',
                      state: place.state || ''
                    }));
                    console.log('📍 Google Places data set as selected:', place);
                  }
                }}
                onGooglePlacesActiveChange={setIsGooglePlacesActive}
                placeholder="Start typing an address..."
                className="text-base py-3"
              />
            </div>
            
            {(googlePlacesData.isSelected ? googlePlacesData.address : formData.address) && (
              <p className="text-sm text-green-600">
                ✅ Address entered: {googlePlacesData.isSelected ? googlePlacesData.address : formData.address}
                {googlePlacesData.isSelected && <span className="ml-2 text-xs">(from Google Places)</span>}
              </p>
            )}
          </div>


          <div className="space-y-2">
            <Label>Days Open *</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const shortDay = day.slice(0, 3);
                const isSelected = formData.days.includes(day);
                return (
                  <Button
                    key={day}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day)}
                    className="min-w-[60px] px-3 py-2"
                  >
                    {shortDay}
                  </Button>
                );
              })}
            </div>
          </div>

          {formData.days.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-12">
                {formData.days.map((day) => (
                  <div key={day} className="space-y-3 border-t pt-4">
                    <h5 className="font-medium">{day}</h5>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Select 
                          value={dayTimeSelections[day]?.startTime || '08:00'}
                          onValueChange={(value) => updateTimeSelection(day, 'startTime', value)}
                        >
                          <SelectTrigger className="w-20 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-md z-50">
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={dayTimeSelections[day]?.startPeriod || 'AM'}
                          onValueChange={(value: 'AM' | 'PM') => updateTimeSelection(day, 'startPeriod', value)}
                        >
                          <SelectTrigger className="w-16 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-md z-50">
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <span className="text-muted-foreground text-sm">to</span>
                      
                      <div className="flex items-center gap-1">
                        <Select
                          value={dayTimeSelections[day]?.endTime || '02:00'}
                          onValueChange={(value) => updateTimeSelection(day, 'endTime', value)}
                        >
                          <SelectTrigger className="w-20 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-md z-50">
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={dayTimeSelections[day]?.endPeriod || 'PM'}
                          onValueChange={(value: 'AM' | 'PM') => updateTimeSelection(day, 'endPeriod', value)}
                        >
                          <SelectTrigger className="w-16 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-md z-50">
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              onClick={() => {
                const effectiveAddress = googlePlacesData.isSelected ? googlePlacesData.address : formData.address;
                console.log('Add Market button clicked!');
                console.log('Effective address for validation:', effectiveAddress);
              }}
              disabled={
                !formData.name.trim() || 
                !(googlePlacesData.isSelected ? googlePlacesData.address.trim() : formData.address.trim()) || 
                formData.days.length === 0
              }
              className={`${
                (!formData.name.trim() || 
                 !(googlePlacesData.isSelected ? googlePlacesData.address.trim() : formData.address.trim()) || 
                 formData.days.length === 0)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-primary/90'
              }`}
            >
              Add Market
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};