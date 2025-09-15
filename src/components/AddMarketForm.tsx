import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AddressAutocomplete } from './AddressAutocomplete';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
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
    hours: ''
  });

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
      hours: ''
    });
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
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
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Downtown Farmers Market"
              autoComplete="off"
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

          <div className="space-y-2">
            <Label htmlFor="hours">Hours</Label>
            <Input
              id="hours"
              value={formData.hours}
              onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
              placeholder="e.g. 8:00 AM - 2:00 PM"
            />
          </div>

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