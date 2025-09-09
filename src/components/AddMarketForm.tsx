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
  markets: Array<{ id: number; name: string; address: string; city: string; state: string; }>;
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

export const AddMarketForm = ({ open, onClose, onMarketAdded, markets }: AddMarketFormProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  
  // Vendor details state
  const [storeName, setStoreName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  const filteredMarkets = markets.filter(market =>
    market.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    // In a real app, this would submit to an API
    console.log({
      selectedMarket,
      vendorDetails: {
        storeName,
        specialty,
        website,
        description
      }
    });
    onClose();
    
    // Reset form
    setSearchTerm('');
    setSelectedMarket('');
    setStoreName('');
    setSpecialty('');
    setWebsite('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply to Join a Market</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="market-search">
              Which farmers market do you want to join? <span className="text-destructive">*</span>
            </Label>
            <Input
              id="market-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for a farmers market..."
            />
            
            {searchTerm && filteredMarkets.length > 0 && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {filteredMarkets.map((market) => (
                  <div
                    key={market.id}
                    className={cn(
                      "p-3 cursor-pointer hover:bg-muted border-b last:border-b-0",
                      selectedMarket === market.name && "bg-muted"
                    )}
                    onClick={() => {
                      setSelectedMarket(market.name);
                      setSearchTerm(market.name);
                    }}
                  >
                    <div className="font-medium">{market.name}</div>
                    <div className="text-sm text-muted-foreground">{market.address}, {market.city}, {market.state}</div>
                  </div>
                ))}
              </div>
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
            disabled={!selectedMarket || !storeName || !description}
            className="bg-earth text-earth-foreground hover:bg-earth/90"
          >
            Submit Application
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};