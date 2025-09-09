import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

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
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Submission | null>(null);
  const [currentSubmissionIndex, setCurrentSubmissionIndex] = useState(0);

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
      setCurrentSubmissionIndex(0); // Reset to first submission when data changes
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const goToPreviousSubmission = () => {
    setCurrentSubmissionIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextSubmission = () => {
    setCurrentSubmissionIndex(prev => Math.min(submissions.length - 1, prev + 1));
  };

  const currentSubmission = submissions[currentSubmissionIndex];

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
        <div className="container mx-auto px-4 flex gap-6">
          {/* Left Sidebar - User Profile */}
          <div className="w-64 flex-shrink-0">
            <div 
              className="bg-card border border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors mb-4"
              onClick={() => navigate('/')}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-semibold text-primary">
                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                
                <h3 className="font-semibold text-lg mb-1">
                  {profile?.full_name || 'Vendor'}
                </h3>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Accept/Reject Buttons */}
            {submissions.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4 mb-4">
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      // TODO: Handle accept logic
                      console.log('Accept clicked for submission:', currentSubmission?.id);
                    }}
                  >
                    Accept
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      // TODO: Handle reject logic
                      console.log('Reject clicked for submission:', currentSubmission?.id);
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            {submissions.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousSubmission}
                    disabled={currentSubmissionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    {currentSubmissionIndex + 1} of {submissions.length}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextSubmission}
                    disabled={currentSubmissionIndex === submissions.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {submissions.length === 0 ? (
              <div className="text-center">
                <h2 className="text-3xl font-semibold mb-4">No Submissions Yet</h2>
                <p className="text-muted-foreground">
                  Your submitted applications will appear here.
                </p>
              </div>
            ) : currentSubmission ? (
              <div className="border rounded-lg p-6 bg-card">
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
                            value={currentSubmission.selected_market || currentSubmission.search_term || ''}
                            readOnly
                            className={`pl-10 h-14 text-lg border-2 border-border rounded-xl ${
                              (currentSubmission.market_address || currentSubmission.market_days || currentSubmission.market_hours) 
                                ? 'cursor-pointer hover:bg-muted/50' 
                                : ''
                            }`}
                            onClick={() => {
                              if (currentSubmission.market_address || currentSubmission.market_days || currentSubmission.market_hours) {
                                setSelectedMarket(currentSubmission);
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Vendor Application Form */}
                      <div className="space-y-6">
                        <VendorApplication 
                          data={{
                            storeName: currentSubmission.store_name,
                            primarySpecialty: currentSubmission.primary_specialty,
                            website: currentSubmission.website,
                            description: currentSubmission.description
                          }}
                          readOnly={true}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Products */}
                {currentSubmission.products && currentSubmission.products.length > 0 && (
                  <Card className="p-6 mt-6">
                    <h4 className="text-lg font-semibold mb-4">Products</h4>
                    <ProductGrid products={currentSubmission.products} />
                  </Card>
                )}
              </div>
            ) : null}
          </div>
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