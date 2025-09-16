import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
}

export default function Test() {
  const [searchTerm, setSearchTerm] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Fetch all markets on component mount
  useEffect(() => {
    fetchMarkets();
  }, []);

  // Filter markets based on search term
  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = markets.filter(market => 
        market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMarkets(filtered);
      setShowResults(true);
    } else {
      setFilteredMarkets([]);
      setShowResults(false);
    }
  }, [searchTerm, markets]);

  const fetchMarkets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching markets:', error);
        return;
      }

      setMarkets(data || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarketSelect = (market: Market) => {
    setSearchTerm(market.name);
    setShowResults(false);
    console.log('Selected market:', market);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4 mb-8 relative">
            <Label htmlFor="market-search" className="text-lg font-medium text-foreground">
              Which farmers market do you want to join? *
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                id="market-search"
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                placeholder="Search for a farmers market..."
                className="pl-10 py-6 text-base border-2 rounded-xl bg-background/50 border-border/50 focus:border-primary focus:bg-background"
              />
            </div>
            
            {/* Search Results Dropdown */}
            {showResults && (
              <Card className="absolute top-full left-0 right-0 z-50 mt-2 max-h-96 overflow-y-auto">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading markets...
                    </div>
                  ) : filteredMarkets.length > 0 ? (
                    <div className="divide-y">
                      {filteredMarkets.map((market) => (
                        <div
                          key={market.id}
                          onClick={() => handleMarketSelect(market)}
                          className="p-4 hover:bg-muted cursor-pointer transition-colors"
                        >
                          <div className="flex items-start space-x-3">
                            <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-foreground truncate">
                                {market.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {market.address}, {market.city}, {market.state}
                              </p>
                              {market.days && market.days.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Open: {market.days.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No markets found matching "{searchTerm}"
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}