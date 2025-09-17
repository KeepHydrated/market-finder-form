import { useState, useRef, useEffect } from "react";
import { Search, Plus, Edit } from "lucide-react";
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
  onEditMarket?: (market: Market) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  submittedMarketName?: string | null;
  disabled?: boolean;
}

export const MarketSearch = ({ markets, onSelectMarket, onAddMarket, onEditMarket, searchTerm, onSearchTermChange, submittedMarketName, disabled = false }: MarketSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMarkets = markets.filter(market =>
    market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showResults = isOpen;
  
  // Sort markets to show selected market at the top
  const sortedMarkets = [...markets].sort((a, b) => {
    const aIsSelected = a.name.toLowerCase() === searchTerm.toLowerCase().trim();
    const bIsSelected = b.name.toLowerCase() === searchTerm.toLowerCase().trim();
    
    if (aIsSelected && !bIsSelected) return -1;
    if (!aIsSelected && bIsSelected) return 1;
    return 0;
  });
  
  const visibleMarkets = sortedMarkets; // Show all markets with selected one first
  const totalItems = visibleMarkets.length + 1; // +1 for "Add Market" option
  const hasTextInSearch = searchTerm.trim().length > 0;
  const isEditingSubmittedMarket = submittedMarketName && searchTerm.toLowerCase().trim() === submittedMarketName.toLowerCase();

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
        if (selectedIndex >= 0 && selectedIndex < visibleMarkets.length) {
          handleSelectMarket(visibleMarkets[selectedIndex]);
        } else if (selectedIndex === visibleMarkets.length) {
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
    onSearchTermChange(market.name);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelectMarket(market);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchTermChange(e.target.value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Which farmers market do you want to join? *
      </label>
      
      <div className="relative w-full" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for a farmers market..."
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => !disabled && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-14 text-lg border-2 border-border rounded-xl"
            disabled={disabled}
          />
        </div>

        {showResults && !disabled && (
          <Card className="absolute top-full left-0 right-0 mt-2 bg-background border border-border shadow-lg z-50">
            <div className="max-h-60 overflow-y-auto">
              {visibleMarkets.map((market, index) => {
                const isCurrentlySelected = market.name.toLowerCase() === searchTerm.toLowerCase().trim();
                return (
                  <button
                    key={market.id}
                    onClick={() => handleSelectMarket(market)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-muted transition-colors",
                      selectedIndex === index && "bg-muted",
                      isCurrentlySelected && "bg-primary/10 border-l-4 border-l-primary"
                    )}
                  >
                    <div className={cn(
                      "font-medium text-foreground",
                      isCurrentlySelected && "text-primary font-semibold"
                    )}>
                      {market.name}
                      {isCurrentlySelected && <span className="ml-2 text-xs text-primary">(Selected)</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {market.city}, {market.state}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => {
                if (isEditingSubmittedMarket && onEditMarket) {
                  const selectedMarket = markets.find(m => m.name.toLowerCase() === searchTerm.toLowerCase());
                  if (selectedMarket) {
                    onEditMarket(selectedMarket);
                  }
                } else {
                  onAddMarket();
                }
              }}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-2 border-t border-border",
                selectedIndex === visibleMarkets.length && "bg-muted"
              )}
            >
              {isEditingSubmittedMarket ? (
                <>
                  <Edit className="h-4 w-4 text-success" />
                  <span className="text-success font-medium">Edit market</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-success" />
                  <span className="text-success font-medium">Add market</span>
                </>
              )}
            </button>
          </Card>
        )}
      </div>
    </div>
  );
};