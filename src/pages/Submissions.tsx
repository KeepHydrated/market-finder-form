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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
}

const Submissions = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);

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
        products: typeof sub.products === 'string' ? JSON.parse(sub.products) : sub.products
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
                  
                  {/* Market Selection Info */}
                  <Card className="mb-6 p-6">
                    <h4 className="text-lg font-semibold mb-4">Which farmers market do you want to join? *</h4>
                    <div className="relative">
                      <div className="flex items-center border border-input rounded-md px-3 py-2 bg-background">
                        <svg
                          className="h-5 w-5 text-muted-foreground mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <span className="text-foreground flex-1">
                          {submission.selected_market || 'Search for a farmers market...'}
                        </span>
                      </div>
                      {submission.search_term && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Search term used: "{submission.search_term}"
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Vendor Application */}
                  <Card className="mb-6 p-6">
                    <VendorApplication 
                      data={{
                        storeName: submission.store_name,
                        primarySpecialty: submission.primary_specialty,
                        website: submission.website,
                        description: submission.description
                      }}
                      readOnly={true}
                    />
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
    </div>
  );
};

export default Submissions;