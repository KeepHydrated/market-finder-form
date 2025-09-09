import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddMarketFormProps {
  open: boolean;
  onClose: () => void;
  onMarketAdded: (marketName: string) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const AddMarketForm = ({ open, onClose, onMarketAdded }: AddMarketFormProps) => {
  const [marketName, setMarketName] = useState('');
  const [address, setAddress] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [hours, setHours] = useState({
    start: '08:00',
    end: '14:00',
    startPeriod: 'AM' as 'AM' | 'PM',
    endPeriod: 'PM' as 'AM' | 'PM',
  });

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = () => {
    // In a real app, this would submit to an API
    console.log({
      marketName,
      address,
      selectedDays,
      hours
    });
    onMarketAdded(marketName);
    onClose();
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
            <div className="flex flex-wrap gap-2">
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
            <div className="space-y-3">
              <h4 className="font-medium">Monday</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Input
                      type="time"
                      value={hours.start}
                      onChange={(e) => setHours(prev => ({ ...prev, start: e.target.value }))}
                      className="pr-8"
                    />
                    <Clock className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <select
                    value={hours.startPeriod}
                    onChange={(e) => setHours(prev => ({ ...prev, startPeriod: e.target.value as 'AM' | 'PM' }))}
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
                      value={hours.end}
                      onChange={(e) => setHours(prev => ({ ...prev, end: e.target.value }))}
                      className="pr-8"
                    />
                    <Clock className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <select
                    value={hours.endPeriod}
                    onChange={(e) => setHours(prev => ({ ...prev, endPeriod: e.target.value as 'AM' | 'PM' }))}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!marketName || !address || selectedDays.length === 0}
            className="bg-earth text-earth-foreground hover:bg-earth/90"
          >
            Add Market
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};