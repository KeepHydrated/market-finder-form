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
    
    if (!formData.name || !formData.address || formData.days.length === 0) {
      return;
    }

    onMarketAdded(formData);
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      days: [],
      hours: {}
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
        className="max-w-2xl"
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
            <Label htmlFor="address-google">Address *</Label>
            <AddressAutocomplete
              id="address-google"
              value={formData.address}
              onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
              onPlaceSelected={(place) => {
                setFormData(prev => ({
                  ...prev,
                  address: place.address,
                  city: place.city,
                  state: place.state
                }));
              }}
              onGooglePlacesActiveChange={setIsGooglePlacesActive}
              placeholder="Start typing an address..."
              required
            />
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
              <Label>Hours</Label>
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
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Market
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};