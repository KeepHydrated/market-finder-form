import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddMarketFormProps {
  open: boolean;
  onClose: () => void;
  onMarketAdded: (marketName: string) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SPECIALTIES = [
  "Fresh Produce",
  "Organic Vegetables", 
  "Fruits",
  "Herbs & Spices",
  "Baked Goods",
  "Dairy Products",
  "Meat & Poultry",
  "Prepared Foods",
  "Flowers & Plants",
  "Artisan Crafts",
  "Honey & Preserves",
  "Other"
];

export const AddMarketForm = ({ open, onClose, onMarketAdded }: AddMarketFormProps) => {
  const [marketName, setMarketName] = useState('');
  const [address, setAddress] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [hours, setHours] = useState<Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>>({});
  
  // Vendor details state
  const [storeName, setStoreName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  const toggleDay = (day: string) => {
    setSelectedDays(prev => {
      const newDays = prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day];
      
      // Add default hours for newly selected days
      if (!prev.includes(day) && newDays.includes(day)) {
        setHours(prevHours => ({
          ...prevHours,
          [day]: {
            start: '08:00',
            end: '14:00',
            startPeriod: 'AM' as 'AM' | 'PM',
            endPeriod: 'PM' as 'AM' | 'PM',
          }
        }));
      }
      // Remove hours for deselected days
      else if (prev.includes(day) && !newDays.includes(day)) {
        setHours(prevHours => {
          const { [day]: removed, ...rest } = prevHours;
          return rest;
        });
      }
      
      return newDays;
    });
  };

  const handleSubmit = () => {
    // In a real app, this would submit to an API
    console.log({
      marketName,
      address,
      selectedDays,
      hours,
      vendorDetails: {
        storeName,
        specialty,
        website,
        description
      }
    });
    onMarketAdded(marketName);
    onClose();
    
    // Reset form
    setMarketName('');
    setAddress('');
    setSelectedDays([]);
    setHours({});
    setStoreName('');
    setSpecialty('');
    setWebsite('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Farmers Market</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="market-name">Market Name *</Label>
            <Input
              id="market-name"
              value={marketName}
              onChange={(e) => setMarketName(e.target.value)}
              placeholder="Enter market name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter market address"
            />
          </div>

          <div className="space-y-4">
            <Label>Market Days *</Label>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant={selectedDays.includes(day) ? "default" : "outline"}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "h-12 px-6",
                    selectedDays.includes(day) && "bg-earth text-earth-foreground hover:bg-earth/90"
                  )}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label>Market Hours</Label>
            {selectedDays.length > 0 ? (
              <div className="space-y-4">
                {selectedDays.map((day) => (
                  <div key={day} className="space-y-3">
                    <h4 className="font-medium">{day === 'Mon' ? 'Monday' : day === 'Tue' ? 'Tuesday' : day === 'Wed' ? 'Wednesday' : day === 'Thu' ? 'Thursday' : day === 'Fri' ? 'Friday' : day === 'Sat' ? 'Saturday' : 'Sunday'}</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Input
                            type="time"
                            value={hours[day]?.start || '08:00'}
                            onChange={(e) => setHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day], start: e.target.value }
                            }))}
                            className="pr-8"
                          />
                          <Clock className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <select
                          value={hours[day]?.startPeriod || 'AM'}
                          onChange={(e) => setHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], startPeriod: e.target.value as 'AM' | 'PM' }
                          }))}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>

                      <span className="text-muted-foreground">to</span>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Input
                            type="time"
                            value={hours[day]?.end || '14:00'}
                            onChange={(e) => setHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day], end: e.target.value }
                            }))}
                            className="pr-8"
                          />
                          <Clock className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <select
                          value={hours[day]?.endPeriod || 'PM'}
                          onChange={(e) => setHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], endPeriod: e.target.value as 'AM' | 'PM' }
                          }))}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select market days above to set hours</p>
            )}
          </div>

          {/* Vendor Details Section */}
          <div className="space-y-6 pt-6 border-t">
            <h3 className="text-lg font-semibold">Vendor Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="store-name">
                Store Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g., Fresh Produce Stand"
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Specialty</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your main specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((specialtyOption) => (
                    <SelectItem key={specialtyOption} value={specialtyOption}>
                      {specialtyOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about your products, farming practices, and what makes your business special..."
                className="min-h-[120px]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!marketName || !address || selectedDays.length === 0 || !storeName || !description}
            className="bg-earth text-earth-foreground hover:bg-earth/90"
          >
            Add Market & Register as Vendor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};