import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Copy, Check, MapPin, ExternalLink } from "lucide-react";
interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string | null;
}

export default function TestShop() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [copied, setCopied] = useState(false);

  // Search markets
  useEffect(() => {
    const searchMarkets = async () => {
      if (!searchQuery.trim()) {
        setMarkets([]);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) {
        console.error("Error searching markets:", error);
      } else {
        setMarkets(data || []);
      }
      setIsLoading(false);
    };

    const debounce = setTimeout(searchMarkets, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
    setSearchQuery("");
    setMarkets([]);
  };

  const getInviteLink = () => {
    if (!selectedMarket) return "";
    return `${window.location.origin}/vendor-signup?market=${selectedMarket.id}`;
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
                <div className="mt-4 border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {markets.map((market) => (
                    <button
                      key={market.id}
                      onClick={() => handleSelectMarket(market)}
                      className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium text-foreground">{market.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {market.city}, {market.state}
                      </div>
                    </button>
                  ))}
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
                  <h3 className="font-semibold text-foreground text-lg">{selectedMarket.name}</h3>
                  <p className="text-muted-foreground">
                    {selectedMarket.address}, {selectedMarket.city}, {selectedMarket.state}
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

                {/* Preview Link */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(getInviteLink(), "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview Link
                </Button>

                {/* Clear Selection */}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setSelectedMarket(null)}
                >
                  Select Different Market
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
