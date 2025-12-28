import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, ShieldAlert, Link2, Copy, Check, Wrench, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GlobalHeader } from '@/components/GlobalHeader';
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

const ALLOWED_EMAIL = 'nadiachibri@gmail.com';

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
}

export default function VendorInviteAdmin() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [marketSearch, setMarketSearch] = useState('');
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const section = searchParams.get('section') || 'link';

  // Check access
  useEffect(() => {
    if (!loading && (!user || user.email !== ALLOWED_EMAIL)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [user, loading, navigate, toast]);

  // Fetch all markets
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const { data, error } = await supabase
          .from('markets')
          .select('id, name, address, city, state')
          .order('name');

        if (error) throw error;
        setMarkets(data || []);
        setFilteredMarkets(data || []);
      } catch (error) {
        console.error('Error fetching markets:', error);
        toast({
          title: "Error",
          description: "Failed to load markets.",
          variant: "destructive",
        });
      } finally {
        setLoadingMarkets(false);
      }
    };

    if (user?.email === ALLOWED_EMAIL) {
      fetchMarkets();
    }
  }, [user, toast]);

  // Filter markets based on search
  useEffect(() => {
    if (!marketSearch.trim()) {
      setFilteredMarkets(markets);
    } else {
      const search = marketSearch.toLowerCase();
      setFilteredMarkets(
        markets.filter(m => 
          m.name.toLowerCase().includes(search) ||
          m.city.toLowerCase().includes(search) ||
          m.state.toLowerCase().includes(search) ||
          m.address.toLowerCase().includes(search)
        )
      );
    }
  }, [marketSearch, markets]);

  const getSignupLink = () => {
    if (!selectedMarketId) return '';
    return `https://fromfarmersmarkets.com/vendor-signup?market=${selectedMarketId}`;
  };

  const copyLink = async () => {
    const link = getSignupLink();
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "The vendor signup link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedMarket = markets.find(m => m.id === Number(selectedMarketId));

  // Show loading or access denied
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.email !== ALLOWED_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background w-full">
        <GlobalHeader />
        
        <div className="flex w-full">
          {/* Sidebar */}
          <Sidebar className="border-r">
            <SidebarContent className="pt-4">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={section === 'link'}
                    onClick={() => setSearchParams({ section: 'link' })}
                    className="w-full"
                  >
                    <Link2 className="h-4 w-4" />
                    <span>Generate Link</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={section === 'email'}
                    onClick={() => setSearchParams({ section: 'email' })}
                    className="w-full"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Send Email</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        
          <main className="flex-1 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold mb-8">Vendor Invite</h1>

              <Card>
                <CardContent className="pt-6 space-y-6">
                  {/* Market Search */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">
                      Which farmers market? *
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={marketSearch}
                        onChange={(e) => setMarketSearch(e.target.value)}
                        placeholder="Search for farmers markets..."
                        className="pl-10"
                      />
                    </div>
                    
                    {loadingMarkets ? (
                      <div className="flex items-center gap-2 text-muted-foreground py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading markets...
                      </div>
                    ) : marketSearch && (
                      <div className="max-h-48 overflow-y-auto border rounded-lg mt-2">
                        {filteredMarkets.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            No markets found
                          </div>
                        ) : (
                          filteredMarkets.slice(0, 20).map((market) => (
                            <button
                              key={market.id}
                              onClick={() => {
                                setSelectedMarketId(String(market.id));
                                setMarketSearch('');
                              }}
                              className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                                selectedMarketId === String(market.id) ? 'bg-primary/10' : ''
                              }`}
                            >
                              <div className="font-medium">{market.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {market.address}, {market.city}, {market.state}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {/* Selected Market Display */}
                    {selectedMarket && !marketSearch && (
                      <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="font-medium">{selectedMarket.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedMarket.address}, {selectedMarket.city}, {selectedMarket.state}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generated Link */}
                  {selectedMarketId && (
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-base font-medium">Vendor Signup Link</Label>
                      <Input
                        value={getSignupLink()}
                        readOnly
                        className="font-mono text-sm bg-muted"
                      />
                      <Button onClick={copyLink} className="w-full" size="lg">
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
