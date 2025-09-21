import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { ProductGrid } from '@/components/ProductGrid';
import { AddProductForm } from '@/components/AddProductForm';
import { AddMarketForm } from '@/components/AddMarketForm';
import { MarketSearch } from '@/components/MarketSearch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ShopData {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any[];
  selected_markets: any[];
  search_term: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const SPECIALTY_CATEGORIES = [
  "Fresh Flowers & Plants",
  "Bakery", 
  "Dairy",
  "Rancher",
  "Beverages",
  "Seasonings & Spices",
  "Pets",
  "Home Goods",
  "Farmers",
  "Ready to Eat",
  "Packaged Goods & Snacks",
  "Artisan"
];

export default function ShopManager() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingShop, setLoadingShop] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<any[]>([]);
  const [marketSearchTerm, setMarketSearchTerm] = useState('');
  const [showAddMarket, setShowAddMarket] = useState(false);
  const [editingMarket, setEditingMarket] = useState<any>(null);
  const [replacementMarket, setReplacementMarket] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeMarketTab, setActiveMarketTab] = useState<number | null>(null);
  const [userSubmittedMarketIds, setUserSubmittedMarketIds] = useState<number[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    store_name: '',
    primary_specialty: '',
    website: '',
    description: '',
  });

  const [products, setProducts] = useState<any[]>([]);

  // Check for public access via URL parameter
  const isPublicAccess = new URLSearchParams(window.location.search).get('demo') === 'true';

  // Fetch user profile
  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is ok
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchShopData();
      fetchMarkets();
      fetchUserProfile();
    } else if (isPublicAccess) {
      loadDemoData();
    }
  }, [user, isPublicAccess]);

  const fetchShopData = async () => {
    if (!user) return;

    try {
      // Check if user has any existing submissions
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching shop data:', error);
        setLoadingShop(false);
        return;
      }

      if (data) {
        const parsedData = {
          ...data,
          products: typeof data.products === 'string' ? JSON.parse(data.products) : data.products || [],
          selected_markets: (() => {
            try {
              return Array.isArray(data.selected_markets) ? data.selected_markets : [];
            } catch (e) {
              console.error('Error parsing selected_markets:', e);
              return [];
            }
          })()
        };
        
        setShopData(parsedData);
        setSelectedMarkets(parsedData.selected_markets || []);
        setProducts(parsedData.products || []);
        setFormData({
          store_name: parsedData.store_name || '',
          primary_specialty: parsedData.primary_specialty || '',
          website: parsedData.website || '',
          description: parsedData.description || '',
        });
        setMarketSearchTerm(parsedData.search_term || '');
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoadingShop(false);
    }
  };

  const loadDemoData = () => {
    const demoShop: ShopData = {
      id: 'demo-shop-id',
      store_name: 'Demo Fresh Market',
      primary_specialty: 'Organic Produce',
      website: 'https://demo-fresh-market.com',
      description: 'A demonstration shop showcasing fresh, organic produce and artisanal goods.',
      products: [
        {
          id: 1,
          name: 'Organic Apples',
          price: 450,
          category: 'Fruits',
          description: 'Fresh organic apples from local orchards',
          image: '/placeholder.svg'
        }
      ],
      selected_markets: [],
      search_term: 'Downtown Farmers Market',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setShopData(demoShop);
    setProducts(demoShop.products || []);
    setFormData({
      store_name: demoShop.store_name,
      primary_specialty: demoShop.primary_specialty,
      website: demoShop.website,
      description: demoShop.description,
    });
    setMarketSearchTerm(demoShop.search_term);
    setLoadingShop(false);
  };

  const fetchMarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching markets:', error);
        return;
      }

      const marketData = data || [];
      setMarkets(marketData);
      
      // Clear selected markets if no markets exist
      if (marketData.length === 0) {
        setSelectedMarkets([]);
        setActiveMarketTab(null);
        setMarketSearchTerm('');
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validation
    if (!formData.store_name.trim()) {
      toast({
        title: "Store Name Required",
        description: "Please enter a store name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.primary_specialty) {
      toast({
        title: "Specialty Required", 
        description: "Please select a primary specialty.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData = {
        user_id: user.id,
        store_name: formData.store_name.trim(),
        primary_specialty: formData.primary_specialty,
        website: formData.website.trim(),
        description: formData.description.trim(),
        products: products,
        selected_markets: selectedMarkets,
        search_term: marketSearchTerm,
        status: 'pending'
      };

      if (shopData) {
        // Update existing submission
        const { error } = await supabase
          .from('submissions')
          .update({
            ...submissionData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shopData.id);

        if (error) throw error;

        toast({
          title: "Submission Updated",
          description: "Your submission has been updated successfully.",
        });
      } else {
        // Create new submission
        const { error } = await supabase
          .from('submissions')
          .insert([submissionData]);

        if (error) throw error;

        toast({
          title: "Submission Created",
          description: "Your submission has been created and is pending review.",
        });
      }

      // Refresh data
      await fetchShopData();
    } catch (error: any) {
      console.error('Error submitting:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit your information.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProduct = (product: any) => {
    const updatedProducts = [...products, { ...product, id: Date.now() }];
    setProducts(updatedProducts);
    setShowAddProduct(false);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setShowAddProduct(true);
  };

  const handleUpdateProduct = (updatedProduct: any) => {
    const updatedProducts = products.map(p => 
      p.id === updatedProduct.id ? updatedProduct : p
    );
    setProducts(updatedProducts);
    setShowAddProduct(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: number) => {
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);
  };

  const handleDuplicateProduct = (product: any) => {
    const newProduct = {
      ...product,
      id: Date.now(),
      name: `${product.name} (Copy)`
    };
    const updatedProducts = [newProduct, ...products];
    setProducts(updatedProducts);
  };

  const handleMarketSelect = async (market: any) => {
    // Check if market is already selected
    if (selectedMarkets.some(m => m.id === market.id) && activeMarketTab === null) {
      toast({
        title: "Market Already Selected",
        description: `${market.name} is already in your selected markets.`,
        variant: "destructive",
      });
      return;
    }

    // If we're editing a market tab (replacement mode)
    if (activeMarketTab !== null) {
      const newSelectedMarkets = [...selectedMarkets];
      newSelectedMarkets[activeMarketTab] = market;
      setSelectedMarkets(newSelectedMarkets);
      setActiveMarketTab(null);
      
      toast({
        title: "Market Updated",
        description: `Market has been updated in your selection.`,
      });
      return;
    }

    // Check if max markets reached (for new additions)
    if (selectedMarkets.length >= 3) {
      toast({
        title: "Maximum Markets Reached",
        description: "You can select up to 3 markets. Remove a market first or replace an existing one.",
        variant: "destructive",
      });
      return;
    }

    // Add new market
    const newSelectedMarkets = [...selectedMarkets, market];
    setSelectedMarkets(newSelectedMarkets);
    setActiveMarketTab(newSelectedMarkets.length - 1);
    
    toast({
      title: "Market Added",
      description: `${market.name} has been added to your selected markets.`,
    });
  };

  const handleRemoveMarket = (marketIndex: number) => {
    const newSelectedMarkets = selectedMarkets.filter((_, index) => index !== marketIndex);
    setSelectedMarkets(newSelectedMarkets);
    
    // Reset active tab if needed
    if (activeMarketTab === marketIndex) {
      setActiveMarketTab(null);
    } else if (activeMarketTab !== null && activeMarketTab > marketIndex) {
      setActiveMarketTab(activeMarketTab - 1);
    }
    
    toast({
      title: "Market Removed",
      description: "Market has been removed from your selection.",
    });
  };

  const handleReplaceMarket = (marketIndex: number) => {
    setActiveMarketTab(marketIndex);
    toast({
      title: "Replace Market",
      description: "Select a new market to replace the current one.",
    });
  };

  const handleEditMarket = (market: any) => {
    setEditingMarket(market);
    setShowAddMarket(true);
  };

  const handleAddMarket = async (marketData: any) => {
    try {
      if (editingMarket) {
        // Update existing market
        const { data: updateData, error } = await supabase
          .from('markets')
          .update(marketData)
          .eq('id', editingMarket.id)
          .select()
          .single();

        if (error) throw error;
        
        // Update the markets list
        setMarkets(prev => prev.map(m => m.id === editingMarket.id ? updateData : m));
        
        toast({
          title: "Market Updated",
          description: `${marketData.name} has been updated.`,
        });
      } else {
        // Create new market
        const { data: insertData, error } = await supabase
          .from('markets')
          .insert([{
            ...marketData,
            user_id: user?.id // Track who created this market
          }])
          .select()
          .single();

        if (error) throw error;

        setMarkets(prev => [...prev, insertData]);
        setUserSubmittedMarketIds(prev => [...prev, insertData.id]);
        
        toast({
          title: "Market Added",
          description: `${marketData.name} has been added to available markets.`,
        });
      }

      setShowAddMarket(false);
      setEditingMarket(null);
      setReplacementMarket(null);

    } catch (error: any) {
      console.error('Error with market:', error);
      toast({
        title: editingMarket ? "Update Failed" : "Add Failed",
        description: error.message || `Failed to ${editingMarket ? 'update' : 'add'} market.`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMarket = async (market: any) => {
    try {
      const { error } = await supabase
        .from('markets')
        .delete()
        .eq('id', market.id);

      if (error) throw error;

      // Remove from markets list
      setMarkets(prev => prev.filter(m => m.id !== market.id));
      
      // Remove from user submitted market IDs
      setUserSubmittedMarketIds(prev => prev.filter(id => id !== market.id));
      
      // Remove from selected markets if it was selected
      const updatedSelectedMarkets = selectedMarkets.filter(m => m.id !== market.id);
      setSelectedMarkets(updatedSelectedMarkets);
      
      // Clear search term since we're deleting markets
      setMarketSearchTerm('');

      // Reset active tab if needed
      if (activeMarketTab !== null && selectedMarkets[activeMarketTab]?.id === market.id) {
        setActiveMarketTab(null);
      }

      toast({
        title: "Market Deleted",
        description: `${market.name} has been removed from available markets.`,
      });

      setShowAddMarket(false);
      setEditingMarket(null);
    } catch (error: any) {
      console.error('Error deleting market:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete market.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {!user && !isPublicAccess ? (
          <div className="flex items-center justify-center min-h-screen">
            <AuthForm />
          </div>
        ) : loadingShop ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">
                {shopData ? `Update Submission - ${shopData.status}` : 'Submit Your Shop'}
              </h1>
              {shopData && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Status: <span className="font-medium capitalize">{shopData.status}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(shopData.updated_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {isPublicAccess && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium">
                  🚧 Demo Mode - This is a preview of the submission interface
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  All data shown is sample data for demonstration purposes
                </p>
              </div>
            )}

            <Tabs defaultValue="shop" className="flex gap-6">
              <TabsList className="flex flex-col h-fit w-48 space-y-1 p-1">
                <TabsTrigger value="shop" className="w-full justify-start">Shop Information</TabsTrigger>
                <TabsTrigger value="products" className="w-full justify-start">Products</TabsTrigger>
              </TabsList>

              <div className="flex-1 space-y-6">
                <TabsContent value="shop" className="space-y-6 max-w-2xl">
                  <Card>
                    <CardHeader>
                      <CardTitle>Shop Information</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Fill out your shop details to get started
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Farmers Markets Section */}
                      <MarketSearch
                        markets={markets}
                        searchTerm={marketSearchTerm}
                        onSearchTermChange={setMarketSearchTerm}
                        onSelectMarket={handleMarketSelect}
                        onAddMarket={(replacementMarket) => {
                          setReplacementMarket(null);
                          setEditingMarket(null);
                          setShowAddMarket(true);
                        }}
                        onEditMarket={handleEditMarket}
                        submittedMarketName={undefined}
                        selectedMarkets={selectedMarkets}
                        onRemoveMarket={(market) => {
                          const marketIndex = selectedMarkets.findIndex(m => m.id === market.id);
                          if (marketIndex !== -1) handleRemoveMarket(marketIndex);
                        }}
                        activeMarketTab={activeMarketTab}
                        onMarketTabChange={setActiveMarketTab}
                        onReplaceMarket={(oldMarket, newMarket) => {
                          const marketIndex = selectedMarkets.findIndex(m => m.id === oldMarket.id);
                          if (marketIndex !== -1) handleReplaceMarket(marketIndex);
                        }}
                        userSubmittedMarketIds={userSubmittedMarketIds}
                        disabled={false}
                      />
                      
                      {/* Store Information Section */}
                      <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="store_name">Store Name *</Label>
                          <Input
                            id="store_name"
                            value={formData.store_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                            placeholder="Enter your store name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="specialty">Primary Specialty *</Label>
                          <Select
                            value={formData.primary_specialty}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, primary_specialty: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a specialty" />
                            </SelectTrigger>
                            <SelectContent>
                              {SPECIALTY_CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                            placeholder="https://example.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Tell us about your shop..."
                            rows={4}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Products</CardTitle>
                      <Button onClick={() => setShowAddProduct(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <ProductGrid
                        products={products}
                        onDeleteProduct={handleDeleteProduct}
                        onDuplicateProduct={handleDuplicateProduct}
                        onEditProduct={handleEditProduct}
                        vendorId={shopData?.id || 'temp'}
                        vendorName={formData.store_name || 'Your Shop'}
                      />
                    </CardContent>
                  </Card>

                  {/* Submit Button */}
                  <div className="flex justify-center pt-6">
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      size="lg"
                      className="px-8"
                    >
                      {isSubmitting ? 'Submitting...' : shopData ? 'Update Submission' : 'Submit for Review'}
                    </Button>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </div>

      <AddProductForm
        open={showAddProduct}
        onClose={() => {
          setShowAddProduct(false);
          setEditingProduct(null);
        }}
        onProductAdded={editingProduct ? handleUpdateProduct : handleAddProduct}
        editingProduct={editingProduct}
      />

      <AddMarketForm
        open={showAddMarket}
        onClose={() => {
          setShowAddMarket(false);
          setEditingMarket(null);
        }}
        onMarketAdded={handleAddMarket}
        editingMarket={editingMarket}
        userZipcode={userProfile?.zipcode}
        onDeleteMarket={handleDeleteMarket}
      />
    </div>
  );
}