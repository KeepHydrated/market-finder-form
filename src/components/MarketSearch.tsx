import { useState, useRef, useEffect } from "react";
import { Search, Plus, Edit, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  selectedMarkets?: Market[];
  onRemoveMarket?: (market: Market) => void;
}

export const MarketSearch = ({ markets, onSelectMarket, onAddMarket, onEditMarket, searchTerm, onSearchTermChange, submittedMarketName, disabled = false, selectedMarkets = [], onRemoveMarket }: MarketSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter out already selected markets and limit selection logic
  const selectedMarketIds = selectedMarkets.map(m => m.id);
  const availableMarkets = markets.filter(market => !selectedMarketIds.includes(market.id));
  const maxMarketsReached = selectedMarkets.length >= 3;
  
  const showResults = isOpen && !maxMarketsReached;
  
  // Sort available markets
  const sortedMarkets = [...availableMarkets].sort((a, b) => {
    const aMatchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
    const bMatchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (aMatchesSearch && !bMatchesSearch) return -1;
    if (!aMatchesSearch && bMatchesSearch) return 1;
    return 0;
  });
  
  const visibleMarkets = sortedMarkets;
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
    onSearchTermChange(''); // Clear search after selection
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
        Which farmers markets do you want to join? (Up to 3) *
      </label>
      
      {/* Selected Markets Display */}
      {selectedMarkets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Selected Markets ({selectedMarkets.length}/3):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedMarkets.map((market) => (
              <Badge 
                key={market.id} 
                variant="secondary" 
                className="flex items-center gap-1 px-3 py-1"
              >
                <span>{market.name}</span>
                {onRemoveMarket && (
                  <button
                    onClick={() => onRemoveMarket(market)}
                    className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      <div className="relative w-full" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={maxMarketsReached ? "Maximum 3 markets selected" : "Search for a farmers market..."}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => !disabled && !maxMarketsReached && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-14 text-lg border-2 border-border rounded-xl"
            disabled={disabled || maxMarketsReached}
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