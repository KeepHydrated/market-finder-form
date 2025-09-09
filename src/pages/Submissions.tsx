import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserMenu } from "@/components/auth/UserMenu";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VendorApplication, VendorApplicationData } from "@/components/VendorApplication";
import { ProductGrid } from "@/components/ProductGrid";
import { MarketDetails } from "@/components/MarketDetails";
import { MarketDetailsModal } from "@/components/MarketDetailsModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

interface Submission {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any[];
  selected_market: string;
  search_term: string;
  status: string;
  created_at: string;
  market_address?: string;
  market_days?: string[];
  market_hours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>;
}

const Submissions = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Submission | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubmissions();
    }
  }, [user]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsedSubmissions = data?.map(sub => ({
        ...sub,
        products: typeof sub.products === 'string' ? JSON.parse(sub.products) : sub.products,
        market_hours: sub.market_hours && typeof sub.market_hours === 'object' && sub.market_hours !== null 
          ? sub.market_hours as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
          : undefined
      })) || [];
      
      setSubmissions(parsedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <AuthForm onSuccess={() => {
          toast({
            title: "Welcome!",
            description: "You've successfully signed in.",
          });
        }} />
      </div>
    );
  }

  // Check if user has permission to view submissions
  if (user.email !== 'nadiachibri@gmail.com') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Universal Header */}
      <Header user={user} profile={profile} />

      {/* Main Content */}
      <main className="py-12">
        <div className="container mx-auto px-4">
          {submissions.length === 0 ? (
            <div className="text-center">
              <h2 className="text-3xl font-semibold mb-4">No Submissions Yet</h2>
              <p className="text-muted-foreground">
                Your submitted applications will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {submissions.map((submission) => (
                <div key={submission.id} className="border rounded-lg p-6 bg-card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Application #{submission.id.slice(-8)}</h3>
                    <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                      {submission.status}
                    </span>
                  </div>
                  
                  {/* Vendor Application */}
                  <Card className="p-6">
                    <div className="w-full max-w-2xl mx-auto">
                      <div className="space-y-6">
                        {/* Market Selection Info */}
                        <div className="space-y-2">
                          <Label className="text-lg font-medium text-foreground">
                            Which farmers market do you want to join? *
                          </Label>
                          
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Search for a farmers market..."
                              value={submission.selected_market || submission.search_term || ''}
                              readOnly
                              className={`pl-10 h-14 text-lg border-2 border-border rounded-xl ${
                                submission.selected_market || submission.search_term || submission.market_address || submission.market_days || submission.market_hours 
                                  ? 'cursor-pointer hover:bg-muted/50' 
                                  : ''
                              }`}
                              onClick={() => {
                                if (submission.selected_market || submission.search_term || submission.market_address || submission.market_days || submission.market_hours) {
                                  setSelectedMarket(submission);
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Vendor Application Form */}
                        <div className="space-y-6">
                          <VendorApplication 
                            data={{
                              storeName: submission.store_name,
                              primarySpecialty: submission.primary_specialty,
                              website: submission.website,
                              description: submission.description
                            }}
                            readOnly={true}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Products */}
                  {submission.products && submission.products.length > 0 && (
                    <Card className="p-6">
                      <h4 className="text-lg font-semibold mb-4">Products</h4>
                      <ProductGrid products={submission.products} />
                    </Card>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Market Details Modal */}
      {selectedMarket && (
        <MarketDetailsModal
          open={!!selectedMarket}
          onClose={() => setSelectedMarket(null)}
          marketName={selectedMarket.selected_market || selectedMarket.search_term || 'Custom Market'}
          marketAddress={selectedMarket.market_address}
          marketDays={selectedMarket.market_days}
          marketHours={selectedMarket.market_hours}
        />
      )}
    </div>
  );
};

export default Submissions;