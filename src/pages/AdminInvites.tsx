import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Copy, ExternalLink } from "lucide-react";
import { MarketSearch } from "@/components/MarketSearch";
import { ShopSidebar } from "@/components/ShopSidebar";
import { ShopMobileNav } from "@/components/ShopMobileNav";
import { SidebarProvider } from "@/components/ui/sidebar";

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string;
}

export default function AdminInvites() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: isAdminLoading } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<Market[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMarketTab, setActiveMarketTab] = useState<number | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);

  useEffect(() => {
    // Set the section query parameter to 'setup'
    if (!searchParams.get('section')) {
      setSearchParams({ section: 'setup' });
    }
  }, [searchParams, setSearchParams]);

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
        // Transform the data to ensure hours is a string
        const transformedData: Market[] = (data || []).map(market => ({
          ...market,
          hours: market.hours || ""
        }));
        setAllMarkets(transformedData);
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
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/vendor-signup?market=${selectedMarket.id}`;
    setGeneratedLink(link);
    
    toast({
      title: "Link Generated",
      description: "Invite link has been created successfully.",
    });
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <ShopSidebar hasShopData={false} />
        
        <div className="flex-1">
          <ShopMobileNav hasShopData={false} />
          
          <div className="space-y-6 ml-4 sm:ml-52 mr-4 sm:mr-8 max-w-3xl pt-16 sm:pt-[40px] pb-4">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="hidden sm:block text-2xl font-bold mb-2">Shop Details</h2>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Market Search */}
                <MarketSearch
                  markets={allMarkets}
                  onSelectMarket={(market) => {
                    setSelectedMarkets([market]);
                    setGeneratedLink(null);
                  }}
                  onAddMarket={() => {}}
                  searchTerm={searchTerm}
                  onSearchTermChange={setSearchTerm}
                  selectedMarkets={selectedMarkets}
                  onRemoveMarket={(market) => {
                    setSelectedMarkets(selectedMarkets.filter(m => m.id !== market.id));
                    setGeneratedLink(null);
                  }}
                  activeMarketTab={activeMarketTab}
                  onMarketTabChange={setActiveMarketTab}
                  onReplaceMarket={(oldMarket, newMarket) => {
                    const newMarkets = selectedMarkets.map(m => 
                      m.id === oldMarket.id ? newMarket : m
                    );
                    setSelectedMarkets(newMarkets);
                    setGeneratedLink(null);
                  }}
                />

                {selectedMarkets.length > 0 && (
                  <div className="pt-4 text-center text-sm text-muted-foreground">
                    Maximum of {selectedMarkets.length}/3 markets selected
                  </div>
                )}

                {/* Generate Button */}
                <Button 
                  onClick={generateInviteLink} 
                  disabled={selectedMarkets.length === 0}
                  className="w-full"
                  size="lg"
                >
                  Generate Invite Link
                </Button>

                {/* Generated Link */}
                {generatedLink && (
                  <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="text-sm font-medium text-foreground">Generated Invite Link</div>
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
      </div>
    </SidebarProvider>
  );
}
