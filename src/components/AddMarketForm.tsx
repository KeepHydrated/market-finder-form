import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

interface AddMarketFormProps {
  open: boolean;
  onClose: () => void;
  onMarketAdded: (marketName: string) => void;
}

// Sample markets for the dropdown
const sampleMarkets = [
  "Downtown Farmers Market",
  "Riverside Community Market", 
  "Sunset Valley Market",
  "Green Hills Market",
  "Valley Fresh Market"
];

export const AddMarketForm = ({ open, onClose, onMarketAdded }: AddMarketFormProps) => {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMarkets = sampleMarkets.filter(market => 
    market.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    // In a real app, this would submit to an API
    console.log({
      selectedMarket
    });
    onMarketAdded(selectedMarket);
    onClose();
  };

  return (
    <div className="space-y-6">
      {/* Market Selection Section */}
      <div className="space-y-3">
        <Label htmlFor="market-search">Which farmers market do you want to join? *</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="market-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Green Hills Market"
            className="pl-9"
          />
        </div>
        
        {/* Dropdown Results */}
        {searchTerm && filteredMarkets.length > 0 && (
          <div className="border rounded-md bg-background shadow-sm">
            {filteredMarkets.map((market) => (
              <button
                key={market}
                type="button"
                onClick={() => {
                  setSelectedMarket(market);
                  setSearchTerm(market);
                }}
                className="w-full text-left px-3 py-2 hover:bg-muted first:rounded-t-md last:rounded-b-md"
              >
                {market}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Additional Details Box */}
      <div className="border rounded-lg p-6 bg-muted/30">
        <h3 className="text-lg font-semibold mb-4">Vendor Details</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-name">Store Name *</Label>
            <Input
              id="store-name"
              placeholder="Enter your store name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="specialty">Primary Specialty *</Label>
            <Input
              id="specialty"
              placeholder="e.g., Organic vegetables, Fresh bread, etc."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!selectedMarket}
        >
          Submit Application
        </Button>
      </div>
    </div>
  );
};