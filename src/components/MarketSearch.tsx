import { useState, useRef, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string;
}

interface MarketSearchProps {
  markets: Market[];
  onSelectMarket: (market: Market) => void;
  onAddMarket: () => void;
}

export const MarketSearch = ({ markets, onSelectMarket, onAddMarket }: MarketSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMarkets = markets.filter(market =>
    market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showResults = isOpen && searchTerm.length > 0;
  const totalItems = filteredMarkets.length + 1; // +1 for "Add Market" option

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredMarkets.length) {
          handleSelectMarket(filteredMarkets[selectedIndex]);
        } else if (selectedIndex === filteredMarkets.length) {
          onAddMarket();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectMarket = (market: Market) => {
    setSearchTerm(market.name);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={dropdownRef}>
      <div className="space-y-2">
        <label className="text-lg font-medium text-foreground">
          Which farmers market do you want to join? *
        </label>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for a farmers market..."
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-14 text-lg border-2 border-border rounded-xl"
          />
        </div>
      </div>

      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-2 bg-background border border-border shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="py-2">
            {filteredMarkets.map((market, index) => (
              <button
                key={market.id}
                onClick={() => handleSelectMarket(market)}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-muted transition-colors",
                  selectedIndex === index && "bg-muted"
                )}
              >
                <div className="font-medium text-foreground">{market.name}</div>
                <div className="text-sm text-muted-foreground">
                  {market.city}, {market.state}
                </div>
              </button>
            ))}
            
            <button
              onClick={onAddMarket}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-2 border-t border-border mt-1",
                selectedIndex === filteredMarkets.length && "bg-muted"
              )}
            >
              <Plus className="h-4 w-4 text-success" />
              <span className="text-success font-medium">Add your market</span>
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};