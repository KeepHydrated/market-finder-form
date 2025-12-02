import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Copy, Link2, MapPin, ExternalLink, Plus } from "lucide-react";
import { FarmersMarketSearch } from "@/components/FarmersMarketSearch";

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string | null;
  google_place_id: string | null;
}

interface SelectedMarket {
  place_id: string;
  name: string;
  address: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  photos?: { photo_reference: string }[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export default function AdminInvites() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: isAdminLoading } = useAdmin();
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<SelectedMarket[]>([]);
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
        setAllMarkets(data || []);
      }
      setIsLoadingMarkets(false);
    };

    if (isAdmin) {
      fetchMarkets();
    }
  }, [isAdmin, toast]);

  const generateInviteLink = async () => {
    if (selectedMarkets.length === 0) {
      toast({
        title: "No Market Selected",
        description: "Please select a market first.",
        variant: "destructive"
      });
      return;
    }

    const selectedMarket = selectedMarkets[0];
    
    // Find the market in database by google_place_id or name
    const dbMarket = allMarkets.find(m => 
      (m.google_place_id && m.google_place_id === selectedMarket.place_id) ||
      m.name.toLowerCase() === (selectedMarket.structured_formatting?.main_text || selectedMarket.name).toLowerCase()
    );

    if (!dbMarket) {
      toast({
        title: "Market Not Found",
        description: "This market hasn't been added to the database yet. Please add it first.",
        variant: "destructive"
      });
      return;
    }

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/vendor-signup?market=${dbMarket.id}`;
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
            {/* Market Search using FarmersMarketSearch component */}
            <div className="space-y-2">
              <FarmersMarketSearch
                selectedMarkets={selectedMarkets}
                onMarketsChange={(markets) => {
                  setSelectedMarkets(markets);
                  setGeneratedLink(null);
                }}
                maxMarkets={1}
                isEditing={true}
              />
            </div>

            {/* Selected Market Details */}
            {selectedMarkets.length > 0 && (() => {
              const selectedMarket = selectedMarkets[0];
              const dbMarket = allMarkets.find(m => 
                (m.google_place_id && m.google_place_id === selectedMarket.place_id) ||
                m.name.toLowerCase() === (selectedMarket.structured_formatting?.main_text || selectedMarket.name).toLowerCase()
              );
              
              return dbMarket ? (
                <Card className="bg-muted/50 border-border">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-foreground">{dbMarket.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {dbMarket.address}, {dbMarket.city}, {dbMarket.state}
                        </p>
                        {dbMarket.days && dbMarket.days.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            📅 {dbMarket.days.join(", ")}
                          </p>
                        )}
                        {dbMarket.hours && (
                          <p className="text-sm text-muted-foreground">
                            🕒 {dbMarket.hours}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()}

            {/* Generate Button */}
            <Button 
              onClick={generateInviteLink} 
              disabled={selectedMarkets.length === 0}
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
