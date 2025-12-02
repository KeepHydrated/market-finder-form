import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VendorApplication, VendorApplicationData } from "@/components/VendorApplication";
import { AddProductForm } from "@/components/AddProductForm";
import { ProductGrid } from "@/components/ProductGrid";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, MapPin, CheckCircle, LogIn } from "lucide-react";
import { GlobalHeader } from "@/components/GlobalHeader";
import { ShopSidebar } from "@/components/ShopSidebar";
import { ShopMobileNav } from "@/components/ShopMobileNav";

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string | null;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string[];
}

export default function VendorSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [marketError, setMarketError] = useState<string | null>(null);
  
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorApplicationData, setVendorApplicationData] = useState<VendorApplicationData>({
    storeName: "",
    primarySpecialty: "",
    website: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const marketId = searchParams.get("market");

  // Restore saved form data on mount (after auth redirect)
  useEffect(() => {
    const savedData = sessionStorage.getItem('pendingVendorApplication');
    if (savedData && user) {
      try {
        const parsed = JSON.parse(savedData);
        setVendorApplicationData(parsed.vendorApplicationData);
        setProducts(parsed.products);
        
        toast({
          title: "Welcome back!",
          description: "Your application has been restored. Click submit to complete.",
        });
      } catch (error) {
        console.error("Error restoring form data:", error);
      }
    }
  }, [user, toast]);

  // Fetch market data from URL param
  useEffect(() => {
    const fetchMarket = async () => {
      if (!marketId) {
        setIsLoadingMarket(false);
        setMarketError("No market specified in the invite link.");
        return;
      }

      setIsLoadingMarket(true);
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .eq("id", parseInt(marketId))
        .single();

      if (error || !data) {
        console.error("Error fetching market:", error);
        setMarketError("Market not found. The invite link may be invalid.");
        setMarket(null);
      } else {
        setMarket(data);
        setMarketError(null);
      }
      setIsLoadingMarket(false);
    };

    fetchMarket();
  }, [marketId]);

  const handleAddProduct = useCallback(() => {
    setShowAddProductForm(true);
  }, []);

  const handleDeleteProduct = useCallback((productId: number) => {
    setProducts(prev => prev.filter(product => product.id !== productId));
    toast({
      title: "Product Deleted",
      description: "The product has been removed.",
    });
  }, [toast]);

  const handleDuplicateProduct = useCallback((product: Product) => {
    const duplicatedProduct: Product = {
      ...product,
      id: Date.now(),
      name: `${product.name} (Copy)`
    };
    setProducts(prev => [duplicatedProduct, ...prev]);
    toast({
      title: "Product Duplicated",
      description: "The product has been duplicated.",
    });
  }, [toast]);

  const handleSubmit = useCallback(async () => {
    // Validate form data first
    if (!market) {
      toast({
        title: "No Market",
        description: "A market is required to submit.",
        variant: "destructive"
      });
      return;
    }

    if (!vendorApplicationData.storeName.trim()) {
      toast({
        title: "Store Name Required",
        description: "Please enter your store name.",
        variant: "destructive"
      });
      return;
    }

    if (!vendorApplicationData.primarySpecialty) {
      toast({
        title: "Category Required",
        description: "Please select a category.",
        variant: "destructive"
      });
      return;
    }

    if (!vendorApplicationData.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a description for your shop.",
        variant: "destructive"
      });
      return;
    }

    // If not authenticated, save data and redirect to auth
    if (!user) {
      const formData = {
        vendorApplicationData,
        products,
        marketId: market.id
      };
      sessionStorage.setItem('pendingVendorApplication', JSON.stringify(formData));
      navigate(`/auth?redirect=${encodeURIComponent(`/vendor-signup?market=${marketId}`)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Format market data similar to existing submission flow
      const marketData = [{
        id: market.id,
        name: market.name,
        address: market.address,
        city: market.city,
        state: market.state,
        days: market.days,
        hours: market.hours
      }];

      const { error } = await supabase
        .from("submissions")
        .insert([{
          user_id: user.id,
          store_name: vendorApplicationData.storeName,
          primary_specialty: vendorApplicationData.primarySpecialty,
          website: vendorApplicationData.website,
          description: vendorApplicationData.description,
          products: products as any,
          selected_markets: marketData as any,
          market_address: `${market.address}, ${market.city}, ${market.state}`,
          market_days: market.days,
          status: "accepted"
        }]);

      if (error) throw error;

      // Clear saved data after successful submission
      sessionStorage.removeItem('pendingVendorApplication');
      
      setIsSubmitted(true);
      toast({
        title: "Application Submitted!",
        description: "Your vendor application has been submitted successfully.",
      });
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, market, vendorApplicationData, products, toast, marketId, navigate]);

  // Loading state
  if (authLoading || isLoadingMarket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Market error state
  if (marketError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive mb-4">
              <MapPin className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Invalid Invite Link</h2>
            <p className="text-muted-foreground mb-4">{marketError}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-primary mb-4">
              <CheckCircle className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Your vendor application for <strong>{market?.name}</strong> has been submitted successfully.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate("/my-shop")} className="w-full">
                Go to My Shop
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <ShopMobileNav />
      
      <div className="flex">
        <ShopSidebar />
        
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-foreground">Join as a Vendor</h1>
              <p className="text-muted-foreground mt-2">
                Complete your profile to start selling at this market.
              </p>
            </div>

        {/* Pre-filled Market Display */}
        {market && (
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Your Market
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-lg">{market.name}</h3>
                <p className="text-muted-foreground">
                  {market.address}, {market.city}, {market.state}
                </p>
                {market.days && market.days.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    📅 {market.days.join(", ")}
                  </p>
                )}
                {market.hours && (
                  <p className="text-sm text-muted-foreground">
                    🕒 {market.hours}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor Application Form - Always visible */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Shop Details</CardTitle>
          </CardHeader>
          <CardContent>
            <VendorApplication
              data={vendorApplicationData}
              onChange={setVendorApplicationData}
              readOnly={false}
            />
          </CardContent>
        </Card>

        {/* Products Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Products</CardTitle>
              <Button onClick={handleAddProduct} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No products added yet.</p>
                <p className="text-sm">Add your products to showcase what you sell.</p>
              </div>
            ) : (
              <ProductGrid
                products={products}
                onDeleteProduct={handleDeleteProduct}
                onDuplicateProduct={handleDuplicateProduct}
              />
            )}
          </CardContent>
        </Card>

            {/* Submit Button - Changes text based on auth status */}
            <div className="flex justify-center">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                size="lg"
                className="px-12"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : user ? (
                  "Submit Application"
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In / Sign Up to Submit
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Add Product Form Modal */}
      <AddProductForm
        open={showAddProductForm}
        onClose={() => setShowAddProductForm(false)}
        onProductAdded={(productData: any) => {
          const newProduct: Product = {
            id: Date.now(),
            name: productData.name,
            description: productData.description,
            price: productData.price,
            images: productData.images
          };
          setProducts(prev => [newProduct, ...prev]);
          toast({
            title: "Product Added",
            description: "Your product has been added.",
          });
          setShowAddProductForm(false);
        }}
      />
    </div>
  );
}
