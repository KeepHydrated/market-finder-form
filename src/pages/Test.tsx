import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

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
  const [showAddMarketModal, setShowAddMarketModal] = useState(false);
  
  // Add Market Form State
  const [marketName, setMarketName] = useState('');
  const [marketAddress, setMarketAddress] = useState('');
  const [selectedDays, setSelectedDays] = useState<Array<{
    day: string;
    startHour: string;
    startPeriod: string;
    endHour: string;
    endPeriod: string;
  }>>([]);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const periods = ['AM', 'PM'];

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

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => {
      const existingDay = prev.find(d => d.day === day);
      if (existingDay) {
        // Remove the day
        return prev.filter(d => d.day !== day);
      } else {
        // Add the day with default times
        return [...prev, {
          day,
          startHour: '08',
          startPeriod: 'AM',
          endHour: '02',
          endPeriod: 'PM'
        }];
      }
    });
  };

  const updateDayTime = (day: string, field: 'startHour' | 'startPeriod' | 'endHour' | 'endPeriod', value: string) => {
    setSelectedDays(prev => prev.map(d => 
      d.day === day ? { ...d, [field]: value } : d
    ));
  };

  const handleAddMarket = () => {
    setShowAddMarketModal(true);
    setShowResults(false);
  };

  const handleCloseModal = () => {
    setShowAddMarketModal(false);
    setMarketName('');
    setMarketAddress('');
    setSelectedDays([]);
  };

  const handleSubmitMarket = async () => {
    console.log('Add Market button clicked');
    console.log('Form data:', {
      marketName,
      marketAddress,
      selectedDays,
      formValid: !(!marketName || !marketAddress || selectedDays.length === 0)
    });

    try {
      // Parse the Google Places address to extract city and state
      const addressParts = marketAddress.split(', ');
      let city = 'Unknown';
      let state = 'Unknown';
      
      if (addressParts.length >= 3) {
        city = addressParts[addressParts.length - 3];
        state = addressParts[addressParts.length - 2];
      }

      console.log('Parsed address:', { city, state });

      // Format the hours data
      const hoursData = selectedDays.reduce((acc, dayObj) => {
        const fullDayName = dayObj.day === 'Mon' ? 'Monday' :
                           dayObj.day === 'Tue' ? 'Tuesday' :
                           dayObj.day === 'Wed' ? 'Wednesday' :
                           dayObj.day === 'Thu' ? 'Thursday' :
                           dayObj.day === 'Fri' ? 'Friday' :
                           dayObj.day === 'Sat' ? 'Saturday' : 'Sunday';
        
        acc[fullDayName] = `${dayObj.startHour}:00 ${dayObj.startPeriod} - ${dayObj.endHour}:00 ${dayObj.endPeriod}`;
        return acc;
      }, {} as Record<string, string>);

      console.log('Hours data:', hoursData);

      const marketData = {
        name: marketName,
        address: marketAddress,
        city: city,
        state: state,
        days: selectedDays.map(d => d.day),
        hours: JSON.stringify(hoursData)
      };

      console.log('Inserting market data:', marketData);

      const { data, error } = await supabase
        .from('markets')
        .insert(marketData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        alert('Failed to add market. Please try again.');
        return;
      }

      console.log('Market added successfully:', data);
      
      // Refresh the markets list
      fetchMarkets();
      
      // Close the modal
      handleCloseModal();
      
      alert('Market added successfully!');
    } catch (error) {
      console.error('Catch error:', error);
      alert('Failed to add market. Please try again.');
    }
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
              <Card className="absolute top-full left-0 right-0 z-50 mt-2 shadow-lg border">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading markets...
                    </div>
                  ) : (
                    <>
                      {/* Search Results */}
                      {filteredMarkets.length > 0 && (
                        <div className="max-h-72 overflow-y-auto divide-y">
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
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* No Results Message */}
                      {filteredMarkets.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground">
                          No markets found matching "{searchTerm}"
                        </div>
                      )}
                      
                      {/* Always Visible Add Market Option */}
                      <div className="border-t bg-muted/30">
                        <div
                          onClick={handleAddMarket}
                          className="p-4 hover:bg-muted cursor-pointer transition-colors flex items-center space-x-3"
                        >
                          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-foreground text-xs font-bold">+</span>
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">
                              Add Market
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Don't see your market? Add it here
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Add Market Modal */}
          <Dialog open={showAddMarketModal} onOpenChange={setShowAddMarketModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Farmers Market</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Market Name */}
                <div className="space-y-2">
                  <Label htmlFor="market-name" className="text-base font-medium">
                    Market Name *
                  </Label>
                  <Input
                    id="market-name"
                    value={marketName}
                    onChange={(e) => setMarketName(e.target.value)}
                    placeholder="e.g. Downtown Farmers Market"
                    className="text-base py-3"
                  />
                </div>
                
                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="market-address" className="text-base font-medium">
                    Address *
                  </Label>
                  <AddressAutocomplete
                    value={marketAddress}
                    onChange={setMarketAddress}
                    onPlaceSelected={(place) => {
                      if (place.address) {
                        setMarketAddress(place.address);
                      }
                    }}
                    placeholder="Enter market address..."
                    className="text-base py-3"
                  />
                </div>
                
                 {/* Days Open */}
                 <div className="space-y-3">
                   <Label className="text-base font-medium">
                     Days Open *
                   </Label>
                   <div className="flex flex-wrap gap-3">
                     {daysOfWeek.map((day) => (
                       <Button
                         key={day}
                         type="button"
                         variant={selectedDays.some(d => d.day === day) ? "default" : "outline"}
                         onClick={() => handleDayToggle(day)}
                         className="min-w-[60px] px-4 py-2"
                       >
                         {day}
                       </Button>
                     ))}
                   </div>
                   
                   {/* Time pickers for selected days */}
                   {selectedDays.length > 0 && (
                     <div className="space-y-4 mt-4">
                       {selectedDays.map((dayObj) => (
                         <div key={dayObj.day} className="flex items-center gap-4">
                           <div className="min-w-[80px] font-medium text-sm">
                             {dayObj.day === 'Mon' ? 'Monday' : 
                              dayObj.day === 'Tue' ? 'Tuesday' :
                              dayObj.day === 'Wed' ? 'Wednesday' :
                              dayObj.day === 'Thu' ? 'Thursday' :
                              dayObj.day === 'Fri' ? 'Friday' :
                              dayObj.day === 'Sat' ? 'Saturday' : 'Sunday'}
                           </div>
                           
                           {/* Start time */}
                           <Select value={dayObj.startHour} onValueChange={(value) => updateDayTime(dayObj.day, 'startHour', value)}>
                             <SelectTrigger className="w-20">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               {hours.map(hour => (
                                 <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           
                           <Select value={dayObj.startPeriod} onValueChange={(value) => updateDayTime(dayObj.day, 'startPeriod', value)}>
                             <SelectTrigger className="w-16">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               {periods.map(period => (
                                 <SelectItem key={period} value={period}>{period}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           
                           <span className="text-muted-foreground">to</span>
                           
                           {/* End time */}
                           <Select value={dayObj.endHour} onValueChange={(value) => updateDayTime(dayObj.day, 'endHour', value)}>
                             <SelectTrigger className="w-20">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               {hours.map(hour => (
                                 <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           
                           <Select value={dayObj.endPeriod} onValueChange={(value) => updateDayTime(dayObj.day, 'endPeriod', value)}>
                             <SelectTrigger className="w-16">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               {periods.map(period => (
                                 <SelectItem key={period} value={period}>{period}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmitMarket}
                    disabled={!marketName || !marketAddress || selectedDays.length === 0}
                    className="px-6 bg-green-600 hover:bg-green-700"
                  >
                    Add Market
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}