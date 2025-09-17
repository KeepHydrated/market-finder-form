import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationInput } from './LocationInput';
import { CheckCircle2 } from 'lucide-react';

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
  editingMarket?: any;
  userZipcode?: string;
}

export const AddMarketForm = ({ open, onClose, onMarketAdded, editingMarket, userZipcode }: AddMarketFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    days: [] as string[],
    hours: {} as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
  });

  // Simplified address state - single source of truth
  const [addressData, setAddressData] = useState({
    value: '',
    isFromGooglePlaces: false,
    city: '',
    state: ''
  });

  const [dayTimeSelections, setDayTimeSelections] = useState<Record<string, {
    startTime: string;
    startPeriod: 'AM' | 'PM';
    endTime: string;
    endPeriod: 'AM' | 'PM';
  }>>({});

  const updateTimeSelection = (day: string, field: string, value: string) => {
    console.log('🔍 updateTimeSelection called:', { day, field, value });
    
    setDayTimeSelections(prev => {
      const updated = {
        ...prev,
        [day]: {
          ...prev[day],
          [field]: value
        }
      };
      console.log('🔍 Updated dayTimeSelections:', updated);
      return updated;
    });

    // Update formData hours - ensure we use the same day key
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

    const addressString = addressData.value.trim();
    const name = formData.name.trim();

    console.log('🔍 Form validation check:');
    console.log('  - Name:', `"${name}"`);
    console.log('  - Address:', `"${addressString}"`);
    console.log('  - Address from Google Places:', addressData.isFromGooglePlaces);
    console.log('  - Days:', formData.days);
    console.log('🔍 Debug form data:');
    console.log('  - formData.hours:', JSON.stringify(formData.hours, null, 2));
    console.log('  - dayTimeSelections:', JSON.stringify(dayTimeSelections, null, 2));

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
      if (!formData.days || formData.days.length === 0) {
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
      
      const hoursArray = formData.days.map(day => {
        const dayAbbrev = dayAbbrevMap[day] || day.slice(0, 3);
        
        // Get time data from formData.hours or dayTimeSelections, with fallbacks
        const formDataTime = formData.hours[day];
        const selectionTime = dayTimeSelections[day];
        
        let startTime = '08:00';
        let startPeriod = 'AM';
        let endTime = '02:00';
        let endPeriod = 'PM';
        
        if (formDataTime) {
          startTime = formDataTime.start;
          startPeriod = formDataTime.startPeriod;
          endTime = formDataTime.end;
          endPeriod = formDataTime.endPeriod;
        } else if (selectionTime) {
          startTime = selectionTime.startTime;
          startPeriod = selectionTime.startPeriod;
          endTime = selectionTime.endTime;
          endPeriod = selectionTime.endPeriod;
        }
        
        return `${dayAbbrev}: ${startTime} ${startPeriod} - ${endTime} ${endPeriod}`;
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
    
    console.log('🔍 Final formatted data before submission:');
    console.log('  - cleanFormData:', JSON.stringify(cleanFormData, null, 2));
    
    onMarketAdded(cleanFormData);
    
    // Reset form
    setFormData({
      name: '',
      days: [],
      hours: {}
    });
    setAddressData({
      value: '',
      isFromGooglePlaces: false,
      city: '',
      state: ''
    });
    setDayTimeSelections({});
  };

  const handleDayToggle = (day: string) => {
    const isCurrentlySelected = formData.days.includes(day);
    
    setFormData(prev => ({
      ...prev,
      days: isCurrentlySelected 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day],
      hours: isCurrentlySelected
        ? // Remove from hours when deselecting
          Object.fromEntries(Object.entries(prev.hours).filter(([key]) => key !== day))
        : // Add to hours when selecting
          {
            ...prev.hours,
            [day]: {
              start: '08:00',
              end: '02:00',
              startPeriod: 'AM',
              endPeriod: 'PM'
            }
          }
    }));

    // Initialize time selection for newly selected day
    if (!isCurrentlySelected) {
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

  // Populate form when editing a market
  useEffect(() => {
    if (editingMarket) {
      // Convert abbreviated days back to full day names
      const abbrevToDayMap: Record<string, string> = {
        'Mon': 'Monday',
        'Tue': 'Tuesday', 
        'Wed': 'Wednesday',
        'Thu': 'Thursday',
        'Fri': 'Friday',
        'Sat': 'Saturday',
        'Sun': 'Sunday'
      };
      
      const fullDayNames = (editingMarket.days || []).map((day: string) => 
        abbrevToDayMap[day] || day
      );
      
      setFormData({
        name: editingMarket.name || '',
        days: fullDayNames,
        hours: {} // Will be populated below
      });
      setAddressData({
        value: editingMarket.address || '',
        isFromGooglePlaces: false,
        city: editingMarket.city || '',
        state: editingMarket.state || ''
      });
      
      // Initialize dayTimeSelections for each day with default values first
      const defaultTimeSelections: Record<string, any> = {};
      (editingMarket.days || []).forEach((day: string) => {
        defaultTimeSelections[day] = {
          startTime: '08:00',
          startPeriod: 'AM',
          endTime: '02:00',
          endPeriod: 'PM'
        };
      });
      
      // Parse and override with actual hours if available
      if (editingMarket.hours) {
        try {
          let hoursString = editingMarket.hours;
          
          // Remove extra quotes if present
          if (typeof hoursString === 'string' && hoursString.startsWith('"') && hoursString.endsWith('"')) {
            hoursString = hoursString.slice(1, -1);
          }
          
          // Parse the hours string format: "Mon: 09:00 AM - 06:00 PM, Thu: 10:00 AM - 01:00 PM"
          if (typeof hoursString === 'string' && hoursString.includes(':')) {
            const dayHourPairs = hoursString.split(', ');
            
            dayHourPairs.forEach(pair => {
              const [dayAbbrev, timeRange] = pair.split(': ');
              if (timeRange && timeRange.includes(' - ')) {
                const [startTime, endTime] = timeRange.split(' - ');
                const [startHour, startPeriod] = startTime.split(' ');
                const [endHour, endPeriod] = endTime.split(' ');
                
                // Convert abbreviated day back to full name for consistency
                const fullDayName = abbrevToDayMap[dayAbbrev] || dayAbbrev;
                
                // Only update if this day is in our selected days
                if (fullDayNames.includes(fullDayName)) {
                  defaultTimeSelections[fullDayName] = {
                    startTime: startHour,
                    startPeriod: startPeriod as 'AM' | 'PM',
                    endTime: endHour,
                    endPeriod: endPeriod as 'AM' | 'PM'
                  };
                }
              }
            });
          }
        } catch (e) {
          console.log('Could not parse market hours:', e);
        }
      }
      
      console.log('🔍 Setting dayTimeSelections to:', defaultTimeSelections);
      setDayTimeSelections(defaultTimeSelections);
      
      // Clean up any inconsistent entries (both abbreviated and full day names)
      setTimeout(() => {
        setDayTimeSelections(prev => {
          const cleaned: typeof prev = {};
          // Only keep entries that match our full day names
          Object.keys(prev).forEach(key => {
            if (fullDayNames.includes(key)) {
              cleaned[key] = prev[key];
            }
          });
          console.log('🔍 Cleaned dayTimeSelections:', cleaned);
          return cleaned;
        });
      }, 100);
      
      // Also populate formData.hours with the parsed time data
      const formDataHours: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }> = {};
      Object.keys(defaultTimeSelections).forEach(day => {
        const timeData = defaultTimeSelections[day];
        formDataHours[day] = {
          start: timeData.startTime,
          end: timeData.endTime,
          startPeriod: timeData.startPeriod,
          endPeriod: timeData.endPeriod
        };
      });
      
      setFormData(prev => ({
        ...prev,
        hours: formDataHours
      }));
    } else {
      // Reset form when not editing
      setFormData({
        name: '',
        days: [],
        hours: {}
      });
      setAddressData({
        value: '',
        isFromGooglePlaces: false,
        city: '',
        state: ''
      });
      setDayTimeSelections({});
    }
  }, [editingMarket]);

  const handleCloseModal = (open: boolean) => {
    // Don't close if Google Places is active
    if (isGooglePlacesActive) {
      return;
    }
    
    if (!open) {
      // Reset form when closing
      setFormData({
        name: '',
        days: [],
        hours: {}
      });
      setAddressData({
        value: '',
        isFromGooglePlaces: false,
        city: '',
        state: ''
      });
      setDayTimeSelections({});
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
            target.closest('[data-google-places]') ||
            target.getAttribute('data-google-places') ||
            target.getAttribute('data-google-places-item')
          )) {
            console.log('Preventing dialog close for Google Places interaction');
            e.preventDefault();
            return;
          }
        }}
        onPointerDownOutside={(e) => {
          // Also prevent pointer events from closing dialog
          const target = e.target as Element;
          if (target && (
            target.closest('.pac-container') ||
            target.classList.contains('pac-item') ||
            target.closest('[data-google-places]')
          )) {
            console.log('Preventing pointer down outside for Google Places');
            e.preventDefault();
          }
        }}>
        <DialogHeader>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Market Name Field - with green styling */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium">Market Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter market name"
              className="rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
              required
            />
          </div>

          {/* Address Field - update to match green styling */}
          <div className="space-y-2 mt-6">
            <Label htmlFor="address" className="text-base font-medium">Address *</Label>
            
            <LocationInput
              label=""
              placeholder="Enter address (autocomplete available)"
              value={addressData.value}
              onChange={(address) => {
                console.log('📍 Address input changed to:', `"${address}"`);
                setAddressData(prev => ({
                  ...prev,
                  value: address,
                  isFromGooglePlaces: false
                }));
              }}
              onLocationSelect={(location) => {
                console.log('📍 Location selected from Google Places:', location);
                if (location && location.description) {
                  setAddressData({
                    value: location.description,
                    isFromGooglePlaces: true,
                    city: '',
                    state: ''
                  });
                }
              }}
              zipcode={userZipcode}
              className="text-base py-3"
            />
            
            {/* Show validation message */}
            {/* Removed address validation message */}
          </div>


          <div className="space-y-2">
            <Label>Times Open *</Label>
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
                const effectiveAddress = addressData.value;
                console.log(`${editingMarket ? 'Update' : 'Add'} Market button clicked!`);
                console.log('Effective address for validation:', effectiveAddress);
              }}
              disabled={
                !formData.name.trim() || 
                !addressData.value.trim() || 
                formData.days.length === 0
              }
              className={`${
                (!formData.name.trim() || 
                 !addressData.value.trim() || 
                 formData.days.length === 0)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-primary/90'
              }`}
            >
              {editingMarket ? 'Update' : 'Add'} Market
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};