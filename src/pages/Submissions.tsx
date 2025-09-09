import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserMenu } from "@/components/auth/UserMenu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VendorApplication, VendorApplicationData } from "@/components/VendorApplication";
import { ProductGrid } from "@/components/ProductGrid";
import { MarketDetails } from "@/components/MarketDetails";
import { Card } from "@/components/ui/card";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">
                Submissions
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <UserMenu user={user} profile={profile} />
            </div>
          </div>
        </div>
      </header>

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