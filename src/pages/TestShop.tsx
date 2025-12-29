import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Copy, Check, MapPin, ExternalLink, Clock, Star } from "lucide-react";

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
  google_place_id?: string;
}

// Helper to safely extract market name (handles case where name might be JSON object)
const getMarketName = (market: Market): string => {
  if (typeof market.name === 'string') {
    // Check if it's a JSON string
    if (market.name.startsWith('{')) {
      try {
        const parsed = JSON.parse(market.name);
        return parsed.name || market.name;
      } catch {
        return market.name;
      }
    }
    return market.name;
  }
  return String(market.name);
};

const getMarketAddress = (market: Market): string => {
  if (typeof market.name === 'string' && market.name.startsWith('{')) {
    try {
      const parsed = JSON.parse(market.name);
      if (parsed.address) return parsed.address;
    } catch {
      // fallback to regular address
    }
  }
  return `${market.address}, ${market.city}, ${market.state}`;
};

const openInGoogleMaps = (address: string, e: React.MouseEvent) => {
  e.stopPropagation();
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  window.open(url, '_blank');
};

export default function TestShop() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [copied, setCopied] = useState(false);

  // Search markets - first local DB, then Google Places if no results
  useEffect(() => {
    const searchMarkets = async () => {
      if (!searchQuery.trim()) {
        setMarkets([]);
        return;
      }

      setIsLoading(true);
      
      // First, search local database
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) {
        console.error("Error searching markets:", error);
      }

      // If local DB has results, use those
      if (data && data.length > 0) {
        setMarkets(data);
        setIsLoading(false);
        return;
      }

      // Otherwise, search Google Places
      try {
        const { data: googleData, error: googleError } = await supabase.functions.invoke(
          "farmers-market-search",
          { body: { query: searchQuery } }
        );

        if (googleError) {
          console.error("Error searching Google Places:", googleError);
          setMarkets([]);
        } else if (googleData?.predictions) {
          // Transform Google Places results to match Market interface
          const googleMarkets: Market[] = googleData.predictions.map((place: any, index: number) => ({
            id: -(index + 1), // Negative IDs for Google results
            name: place.name,
            address: place.address || place.structured_formatting?.secondary_text || "",
            city: "",
            state: "",
            days: [],
            hours: place.opening_hours?.weekday_text?.join(", ") || null,
            google_rating: place.rating || null,
            google_rating_count: place.user_ratings_total || null,
            google_place_id: place.place_id,
          }));
          setMarkets(googleMarkets);
        } else {
          setMarkets([]);
        }
      } catch (err) {
        console.error("Error calling Google Places:", err);
        setMarkets([]);
      }
      
      setIsLoading(false);
    };

    const debounce = setTimeout(searchMarkets, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
    setSearchQuery("");
    setMarkets([]);
  };

  const getInviteLink = () => {
    if (!selectedMarket) return "";
    const baseUrl = "https://fromfarmersmarkets.com";
    // For Google Places results (negative IDs), use google_place_id
    if (selectedMarket.id < 0 && selectedMarket.google_place_id) {
      return `${baseUrl}/my-shop?place_id=${selectedMarket.google_place_id}`;
    }
    return `${baseUrl}/my-shop?market=${selectedMarket.id}`;
  };

  const handleCopyLink = async () => {
    const link = getInviteLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "The vendor invite link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="p-4 md:p-8">
        <div className="max-w-xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">Vendor Invite Generator</h1>
            <p className="text-muted-foreground mt-2">
              Select a market and share the link with vendors to join.
            </p>
          </div>

          {/* Market Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Select a Market
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search markets by name or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Search Results */}
              {isLoading && (
                <div className="mt-4 text-center text-muted-foreground">
                  Searching...
                </div>
              )}

              {markets.length > 0 && (
                <div className="mt-4 border rounded-lg divide-y max-h-[400px] overflow-y-auto bg-background">
                  {markets.map((market) => {
                    const name = getMarketName(market);
                    const address = getMarketAddress(market);
                    return (
                      <div
                        key={market.id}
                        onClick={() => handleSelectMarket(market)}
                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="font-semibold text-foreground text-base">{name}</div>
                            
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{address}</span>
                            </div>

                            {market.hours && (
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="font-medium">Hours: </span>
                                  <span>{market.hours}</span>
                                </div>
                              </div>
                            )}

                            {market.days && market.days.length > 0 && (
                              <div className="text-sm text-muted-foreground">
                                📅 {market.days.join(", ")}
                              </div>
                            )}

                            {market.google_rating && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                <span>{market.google_rating.toFixed(1)}</span>
                                {market.google_rating_count && (
                                  <span className="text-xs">({market.google_rating_count} reviews)</span>
                                )}
                              </div>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => openInGoogleMaps(address, e)}
                              className="mt-2"
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              View on Map
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Market & Link */}
          {selectedMarket && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Selected Market</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{getMarketName(selectedMarket)}</h3>
                  <p className="text-muted-foreground">
                    {getMarketAddress(selectedMarket)}
                  </p>
                  {selectedMarket.days && selectedMarket.days.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      📅 {selectedMarket.days.join(", ")}
                    </p>
                  )}
                </div>

                {/* Generated Link */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Vendor Invite Link</label>
                  <div className="flex gap-2">
                    <Input
                      value={getInviteLink()}
                      readOnly
                      className="bg-background font-mono text-sm"
                    />
                    <Button onClick={handleCopyLink} variant="secondary">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
