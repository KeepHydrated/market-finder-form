import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Copy, Link2, Search, MapPin, ExternalLink, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string | null;
}

export default function AdminInvites() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: isAdminLoading } = useAdmin();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      navigate("/");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
    }
  }, [isAdmin, isAdminLoading, navigate, toast]);

  useEffect(() => {
    const fetchMarkets = async () => {
      setIsLoadingMarkets(true);
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .order("name");
      
      if (error) {
        console.error("Error fetching markets:", error);
        toast({
          title: "Error",
          description: "Failed to load markets.",
          variant: "destructive"
        });
      } else {
        setMarkets(data || []);
      }
      setIsLoadingMarkets(false);
    };

    if (isAdmin) {
      fetchMarkets();
    }
  }, [isAdmin, toast]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMarkets = markets.filter(market => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      market.name.toLowerCase().includes(search) ||
      market.city.toLowerCase().includes(search) ||
      market.state.toLowerCase().includes(search) ||
      market.address.toLowerCase().includes(search)
    );
  });

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
    setSearchTerm("");
    setIsDropdownOpen(false);
    setGeneratedLink(null);
  };

  const handleRemoveMarket = () => {
    setSelectedMarket(null);
    setGeneratedLink(null);
  };

  const generateInviteLink = () => {
    if (!selectedMarket) {
      toast({
        title: "No Market Selected",
        description: "Please select a market first.",
        variant: "destructive"
      });
      return;
    }

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/vendor-signup?market=${selectedMarket.id}`;
    setGeneratedLink(link);
  };

  const copyToClipboard = async () => {
    if (generatedLink) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        toast({
          title: "Copied!",
          description: "Invite link copied to clipboard.",
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to copy link.",
          variant: "destructive"
        });
      }
    }
  };

  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Vendor Invites</h1>
          <p className="text-muted-foreground mt-2">
            Generate invite links for vendors to easily sign up for specific markets.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Generate Invite Link
            </CardTitle>
            <CardDescription>
              Select a market to create a pre-filled signup link for vendors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Market Search - Similar to MarketSearch component */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Select a farmers market *
              </Label>

              {/* Selected Market as Pill */}
              {selectedMarket && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground border border-primary">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">{selectedMarket.name}</span>
                    <button
                      onClick={handleRemoveMarket}
                      className="rounded-full p-0.5 hover:bg-primary-foreground/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Search Input with Dropdown */}
              <div className="relative w-full" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder={selectedMarket ? "Change market..." : "Search for a farmers market..."}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="pl-10 h-14 text-lg border-2 border-border rounded-xl"
                    disabled={isLoadingMarkets}
                  />
                </div>

                {/* Dropdown Results */}
                {isDropdownOpen && !isLoadingMarkets && (
                  <Card className="absolute top-full left-0 right-0 mt-2 bg-background border border-border shadow-lg z-50">
                    <div className="max-h-60 overflow-y-auto">
                      {filteredMarkets.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          No markets found matching your search.
                        </div>
                      ) : (
                        filteredMarkets.map((market) => {
                          const isSelected = selectedMarket?.id === market.id;
                          return (
                            <button
                              key={market.id}
                              onClick={() => handleSelectMarket(market)}
                              className={cn(
                                "w-full px-4 py-3 text-left transition-colors hover:bg-muted cursor-pointer",
                                isSelected && "bg-primary/10 border-l-4 border-l-primary"
                              )}
                            >
                              <div className={cn(
                                "font-medium text-foreground text-base mb-1",
                                isSelected && "text-primary font-semibold"
                              )}>
                                {market.name}
                                {isSelected && <span className="ml-2 text-xs text-primary">(Selected)</span>}
                              </div>
                              <div className="text-sm text-muted-foreground mb-1">
                                📍 {market.address}, {market.city}, {market.state}
                              </div>
                              {market.days && market.days.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  📅 {market.days.join(', ')}
                                </div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </Card>
                )}
              </div>

              {isLoadingMarkets && (
                <div className="text-sm text-muted-foreground">Loading markets...</div>
              )}
            </div>

            {/* Selected Market Details */}
            {selectedMarket && (
              <Card className="bg-muted/50 border-border">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedMarket.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedMarket.address}, {selectedMarket.city}, {selectedMarket.state}
                      </p>
                      {selectedMarket.days && selectedMarket.days.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          📅 {selectedMarket.days.join(", ")}
                        </p>
                      )}
                      {selectedMarket.hours && (
                        <p className="text-sm text-muted-foreground">
                          🕒 {selectedMarket.hours}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generate Button */}
            <Button 
              onClick={generateInviteLink} 
              disabled={!selectedMarket}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Invite Link
            </Button>

            {/* Generated Link */}
            {generatedLink && (
              <div className="space-y-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <Label className="text-primary">Generated Invite Link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={generatedLink} 
                    readOnly 
                    className="bg-background font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => window.open(generatedLink, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with vendors. The market will be pre-selected when they open it.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
