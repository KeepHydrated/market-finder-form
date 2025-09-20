import { useState, useRef, useEffect } from "react";
import { Search, Plus, Edit, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  onAddMarket: (replacementMarket?: Market) => void;
  onEditMarket?: (market: Market) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  submittedMarketName?: string | null;
  disabled?: boolean;
  selectedMarkets?: Market[];
  onRemoveMarket?: (market: Market) => void;
  activeMarketTab?: number | null;
  onMarketTabChange?: (tabIndex: number | null) => void;
  onReplaceMarket?: (oldMarket: Market, newMarket: Market) => void;
  userSubmittedMarketIds?: number[];
}

export const MarketSearch = ({ 
  markets, 
  onSelectMarket, 
  onAddMarket, 
  onEditMarket, 
  searchTerm, 
  onSearchTermChange, 
  submittedMarketName, 
  disabled = false, 
  selectedMarkets = [], 
  onRemoveMarket,
  activeMarketTab,
  onMarketTabChange,
  onReplaceMarket,
  userSubmittedMarketIds = []
}: MarketSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Track selected markets for highlighting
  const selectedMarketIds = selectedMarkets.map(m => m.id);
  const isEditingMarket = activeMarketTab !== null && activeMarketTab !== undefined;
  const editingMarket = isEditingMarket ? selectedMarkets[activeMarketTab] : null;
  
  // Check if the current active tab is a user-submitted market
  const isActiveTabUserSubmitted = isEditingMarket && editingMarket && userSubmittedMarketIds.includes(editingMarket.id);
  
  // Set first tab as active by default when there are markets but no active tab
  useEffect(() => {
    if (selectedMarkets.length > 0 && (activeMarketTab === null || activeMarketTab === undefined)) {
      // Only auto-select first tab if we actually have markets and this isn't a removal scenario
      // Check if this is during initial load or a legitimate need to select first tab
      onMarketTabChange?.(0);
      const firstMarket = selectedMarkets[0];
      const marketInfo = `${firstMarket.name} - ${firstMarket.address}, ${firstMarket.city}, ${firstMarket.state}`;
      onSearchTermChange(marketInfo);
    } else if (selectedMarkets.length === 0) {
      // Clear search term when no markets are selected
      onSearchTermChange('');
    }
  }, [selectedMarkets.length, activeMarketTab, onMarketTabChange, onSearchTermChange, selectedMarkets]);

  // Update search term when active tab changes
  useEffect(() => {
    if (activeMarketTab !== null && activeMarketTab !== undefined && selectedMarkets[activeMarketTab]) {
      const selectedMarket = selectedMarkets[activeMarketTab];
      const marketInfo = `${selectedMarket.name} - ${selectedMarket.address}, ${selectedMarket.city}, ${selectedMarket.state}`;
      onSearchTermChange(marketInfo);
    }
  }, [activeMarketTab, selectedMarkets, onSearchTermChange]);
  
  // Show all markets in dropdown, but highlight selected ones
  const availableMarkets = markets;
  
  const maxMarketsReached = selectedMarkets.length >= 3;
  
  const showResults = isOpen;
  
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
          handleSubmitNewMarket();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectMarket = (market: Market) => {
    // Check if market is already selected (prevent duplicates)
    if (selectedMarketIds.includes(market.id)) {
      setIsOpen(false);
      setSelectedIndex(-1);
      // Don't clear search term, just close dropdown
      return;
    }
    
    onSearchTermChange(''); // Clear search after selection
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (isEditingMarket && editingMarket && onReplaceMarket) {
      // Replace the market being edited
      onReplaceMarket(editingMarket, market);
      // Keep the same active tab
    } else {
      // Add new market
      onSelectMarket(market);
      // Set the newly selected market as the active tab
      const newActiveTabIndex = selectedMarkets.length; // Index will be at the end after adding
      onMarketTabChange?.(newActiveTabIndex);
    }
  };

  const handleSubmitNewMarket = () => {
    if (isEditingSubmittedMarket && onEditMarket) {
      const selectedMarket = markets.find(m => m.name.toLowerCase() === searchTerm.toLowerCase()) ||
                           selectedMarkets.find(m => m.name.toLowerCase() === searchTerm.toLowerCase());
      if (selectedMarket) {
        onEditMarket(selectedMarket);
      }
    } else if (isActiveTabUserSubmitted && editingMarket && onEditMarket) {
      // Edit the user-submitted market from the active tab
      onEditMarket(editingMarket);
    } else {
      // If a tab is active, pass the replacement context
      const replacementContext = (activeMarketTab !== null && activeMarketTab !== undefined) 
        ? selectedMarkets[activeMarketTab] 
        : null;
      onAddMarket(replacementContext);
    }
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onSearchTermChange(e.target.value);
      if (!isOpen) {
        setIsOpen(true);
      }
      setSelectedIndex(-1);
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Which farmers markets do you sell at? (Up to 3) *
      </label>
      
      {/* Selected Markets as Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedMarkets.map((market, index) => (
          <div 
            key={market.id}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-colors border",
              activeMarketTab === index 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted/50 border-border hover:bg-muted"
            )}
          >
            <button
              onClick={() => {
                if (!disabled) {
                  onMarketTabChange?.(index);
                  const marketInfo = `${market.name} - ${market.address}, ${market.city}, ${market.state}`;
                  onSearchTermChange(marketInfo);
                }
              }}
              className="text-sm font-medium"
              disabled={disabled}
            >
              {market.name}
            </button>
            {onRemoveMarket && (
              <button
                onClick={() => {
                  if (!disabled) {
                    onRemoveMarket(market);
                    // Clear search term immediately when removing
                    onSearchTermChange('');
                    if (activeMarketTab === index) {
                      onMarketTabChange?.(null);
                    }
                  }
                }}
                disabled={disabled}
                className={cn(
                  "rounded-full p-0.5 transition-colors",
                  disabled 
                    ? "opacity-50 cursor-not-allowed"
                    : activeMarketTab === index 
                      ? "hover:bg-primary-foreground/20" 
                      : "hover:bg-destructive hover:text-destructive-foreground"
                )}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        
        {/* Add Market Plus Button */}
        <button
          type="button"
          onClick={() => {
            // Create a new empty market slot and open dropdown
            onSearchTermChange('');
            onMarketTabChange?.(selectedMarkets.length); // Set active tab to new slot
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          disabled={maxMarketsReached || disabled}
          className={cn(
            "flex items-center gap-2 px-4 py-2 border border-dashed rounded-full transition-colors",
            maxMarketsReached || disabled
              ? "bg-muted/20 border-muted-foreground/40 text-muted-foreground/70 cursor-not-allowed opacity-50"
              : "bg-background border-muted-foreground/50 hover:bg-muted text-foreground hover:text-foreground"
          )}
          title={maxMarketsReached ? "Maximum 3 markets allowed" : disabled ? "Click Edit to modify markets" : "Add another market"}
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Add</span>
        </button>
      </div>
      
      <div className="relative w-full" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for a farmers market..."
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onClick={handleInputFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="pl-10 h-14 text-lg border-2 border-border rounded-xl"
          />
        </div>
        

         {showResults && (
           <Card className="absolute top-full left-0 right-0 mt-2 bg-background border border-border shadow-lg z-50">
              {maxMarketsReached && !isEditingMarket && (
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Maximum 3 markets selected. Select a market tab above to replace it, or remove a market to add a new one.
                  </p>
                </div>
              )}
             <div className="max-h-60 overflow-y-auto">
               {visibleMarkets.map((market, index) => {
                 const isActiveTab = isEditingMarket && editingMarket && market.id === editingMarket.id;
                 const isAlreadySelected = selectedMarketIds.includes(market.id);
                 const canSelect = (!maxMarketsReached || isEditingMarket) && !isAlreadySelected;
                 return (
                   <button
                     key={market.id}
                     onClick={() => canSelect && handleSelectMarket(market)}
                     className={cn(
                       "w-full px-4 py-3 text-left transition-colors",
                       canSelect ? "hover:bg-muted cursor-pointer" : "cursor-not-allowed opacity-50",
                       selectedIndex === index && canSelect && "bg-muted",
                       isActiveTab && "bg-primary/10 border-l-4 border-l-primary",
                       isAlreadySelected && !isActiveTab && "bg-muted/30 border-l-4 border-l-muted-foreground"
                     )}
                     disabled={!canSelect}
                   >
                    <div className={cn(
                      "font-medium text-foreground",
                      isActiveTab && "text-primary font-semibold",
                      isAlreadySelected && !isActiveTab && "text-muted-foreground"
                    )}>
                      {market.name}
                      {isActiveTab && <span className="ml-2 text-xs text-primary">(Selected)</span>}
                      {isAlreadySelected && !isActiveTab && <span className="ml-2 text-xs text-muted-foreground">(Already added)</span>}
                    </div>
                    <div className={cn(
                      "text-sm text-muted-foreground",
                      isAlreadySelected && !isActiveTab && "text-muted-foreground/70"
                    )}>
                      {market.city}, {market.state}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={handleSubmitNewMarket}
              className={cn(
                "w-full px-4 py-3 text-left transition-colors flex items-center gap-2 border-t border-border cursor-pointer",
                selectedIndex === visibleMarkets.length ? "bg-muted hover:bg-muted" : "hover:bg-muted"
              )}
            >
              {isEditingSubmittedMarket ? (
                <>
                  <Edit className="h-4 w-4 text-success" />
                  <span className="text-success font-medium">Edit market</span>
                </>
              ) : isActiveTabUserSubmitted ? (
                <>
                  <Edit className="h-4 w-4 text-success" />
                  <span className="text-success font-medium">Edit market</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-success" />
                  <span className="text-success font-medium">Submit new market</span>
                </>
              )}
            </button>
          </Card>
        )}
      </div>
    </div>
  );
};