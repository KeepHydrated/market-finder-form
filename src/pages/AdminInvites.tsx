import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Copy, Link, Search, MapPin, ExternalLink, Plus } from "lucide-react";

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

  const filteredMarkets = markets.filter(market => {
    const search = searchTerm.toLowerCase();
    return (
      market.name.toLowerCase().includes(search) ||
      market.city.toLowerCase().includes(search) ||
      market.state.toLowerCase().includes(search) ||
      market.address.toLowerCase().includes(search)
    );
  });

  const handleSelectMarket = (marketId: string) => {
    const market = markets.find(m => m.id.toString() === marketId);
    setSelectedMarket(market || null);
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
              <Link className="h-5 w-5" />
              Generate Invite Link
            </CardTitle>
            <CardDescription>
              Select a market to create a pre-filled signup link for vendors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Market Search */}
            <div className="space-y-2">
              <Label>Search Markets</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, city, or state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Market Select */}
            <div className="space-y-2">
              <Label>Select Market</Label>
              {isLoadingMarkets ? (
                <div className="text-sm text-muted-foreground">Loading markets...</div>
              ) : (
                <Select 
                  value={selectedMarket?.id.toString() || ""} 
                  onValueChange={handleSelectMarket}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a market" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMarkets.map((market) => (
                      <SelectItem key={market.id} value={market.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{market.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {market.city}, {market.state}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Markets Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-3xl font-bold text-foreground">{markets.length}</div>
                <div className="text-sm text-muted-foreground">Total Markets</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-3xl font-bold text-foreground">{filteredMarkets.length}</div>
                <div className="text-sm text-muted-foreground">Filtered Results</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
