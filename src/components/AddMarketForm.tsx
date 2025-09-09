import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddMarketFormProps {
  open: boolean;
  onClose: () => void;
  onMarketAdded: (marketName: string) => void;
  markets: Array<{ id: number; name: string; }>;
}

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
  const [selectedMarket, setSelectedMarket] = useState('');
  const [vendorData, setVendorData] = useState({
    storeName: '',
    specialty: '',
    website: '',
    description: ''
  });

  const handleSubmit = () => {
    // In a real app, this would submit to an API
    console.log("Vendor application:", { 
      selectedMarket,
      ...vendorData
    });
    onMarketAdded(selectedMarket);
    onClose();
    // Reset form
    setSelectedMarket('');
    setVendorData({
      storeName: '',
      specialty: '',
      website: '',
      description: ''
    });
  };

  const isFormValid = selectedMarket && vendorData.storeName.trim() && vendorData.specialty && vendorData.description.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vendor Application</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Market Selection */}
          <div className="space-y-2">
            <Label>
              Which farmers market do you want to join? <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger>
                <SelectValue placeholder="Search and select a market" />
              </SelectTrigger>
              <SelectContent>
                {markets.map((market) => (
                  <SelectItem key={market.id} value={market.name}>
                    {market.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor Details */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="store-name">
                Store Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="store-name"
                value={vendorData.storeName}
                onChange={(e) => setVendorData(prev => ({ ...prev, storeName: e.target.value }))}
                placeholder="e.g., Fresh Produce Stand"
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Specialty</Label>
              <Select 
                value={vendorData.specialty} 
                onValueChange={(value) => setVendorData(prev => ({ ...prev, specialty: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your main specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
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
                value={vendorData.website}
                onChange={(e) => setVendorData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={vendorData.description}
                onChange={(e) => setVendorData(prev => ({ ...prev, description: e.target.value }))}
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
            disabled={!isFormValid}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            Submit Application
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};