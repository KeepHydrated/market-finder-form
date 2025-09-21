import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Edit, Save, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { ProductGrid } from '@/components/ProductGrid';
import { AddProductForm } from '@/components/AddProductForm';
import { AddMarketForm } from '@/components/AddMarketForm';
import { FarmersMarketSearch } from '@/components/FarmersMarketSearch';
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
  vacation_mode?: boolean;
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    revenue: 0,
    shopViews: 0,
    averageRating: 0,
    reviewCount: 0,
    recentOrders: [],
    topProducts: []
  });

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

  useEffect(() => {
    // Set active tab based on whether shop data exists
    setActiveTab(shopData ? "overview2" : "overview");
  }, [shopData]);

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
      
      // Identify markets submitted by current user
      if (user?.id) {
        const userMarketIds = marketData
          .filter(market => market.user_id === user.id)
          .map(market => market.id);
        setUserSubmittedMarketIds(userMarketIds);
      }
      
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

  const handleDeleteSubmission = async () => {
    if (!user || !shopData) return;

    if (!confirm('Are you sure you want to delete your submission? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // Reset all state
      setShopData(null);
      setProducts([]);
      setSelectedMarkets([]);
      setFormData({
        store_name: '',
        primary_specialty: '',
        website: '',
        description: '',
      });
      setMarketSearchTerm('');
      setIsEditMode(false);

      toast({
        title: "Submission Deleted",
        description: "Your submission has been successfully deleted. You can now start fresh.",
      });

    } catch (error: any) {
      console.error('Error deleting submission:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete submission.",
        variant: "destructive",
      });
    }
  };

  const fetchAnalytics = async () => {
    if (!shopData) return;

    try {
      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('vendor_id', shopData.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('vendor_id', shopData.id);

      if (reviewsError) throw reviewsError;

      // Calculate analytics
      const totalOrders = orders?.length || 0;
      const revenue = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const averageRating = reviews?.length ? 
        reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

      // Get recent orders (last 5)
      const recentOrders = orders?.slice(0, 5) || [];

      // Calculate top products from order items
      const productSales: Record<string, { name: string; count: number; price: number }> = {};
      orders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          if (!productSales[item.product_name]) {
            productSales[item.product_name] = {
              name: item.product_name,
              count: 0,
              price: item.unit_price
            };
          }
          productSales[item.product_name].count += item.quantity;
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalOrders,
        revenue: revenue / 100, // Convert from cents
        shopViews: 0, // We don't track views yet
        averageRating,
        reviewCount: reviews?.length || 0,
        recentOrders,
        topProducts
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleAddProduct = async (product: any) => {
    console.log('Adding product:', product);
    const updatedProducts = [...products, { ...product, id: Date.now() }];
    console.log('Updated products list:', updatedProducts);
    setProducts(updatedProducts);
    setShowAddProduct(false);
    
    // If shop is already published, save products to database immediately
    if (shopData && user) {
      try {
        const { error } = await supabase
          .from('submissions')
          .update({ 
            products: updatedProducts,
            updated_at: new Date().toISOString()
          })
          .eq('id', shopData.id);

        if (error) throw error;

        toast({
          title: "Product Added & Saved",
          description: `${product.name} has been added and saved to your shop.`,
        });
      } catch (error: any) {
        console.error('Error saving product:', error);
        toast({
          title: "Product Added Locally",
          description: `${product.name} was added but couldn't be saved. Please try editing your shop to save changes.`,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Product Added",
        description: `${product.name} has been added to your product list.`,
      });
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setShowAddProduct(true);
  };

  const handleUpdateProduct = async (updatedProduct: any) => {
    const updatedProducts = products.map(p => 
      p.id === updatedProduct.id ? updatedProduct : p
    );
    setProducts(updatedProducts);
    setShowAddProduct(false);
    setEditingProduct(null);
    
    // If shop is already published, save products to database immediately
    if (shopData && user) {
      try {
        const { error } = await supabase
          .from('submissions')
          .update({ 
            products: updatedProducts,
            updated_at: new Date().toISOString()
          })
          .eq('id', shopData.id);

        if (error) throw error;

        toast({
          title: "Product Updated & Saved",
          description: `${updatedProduct.name} has been updated and saved.`,
        });
      } catch (error: any) {
        console.error('Error saving product:', error);
        toast({
          title: "Product Updated Locally",
          description: `${updatedProduct.name} was updated but couldn't be saved. Please try editing your shop to save changes.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);
    
    // If shop is already published, save products to database immediately
    if (shopData && user) {
      try {
        const { error } = await supabase
          .from('submissions')
          .update({ 
            products: updatedProducts,
            updated_at: new Date().toISOString()
          })
          .eq('id', shopData.id);

        if (error) throw error;

        toast({
          title: "Product Deleted & Saved",
          description: "Product has been deleted and changes saved.",
        });
      } catch (error: any) {
        console.error('Error saving after delete:', error);
        toast({
          title: "Product Deleted Locally",
          description: "Product was deleted but changes couldn't be saved. Please try editing your shop to save changes.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Product Deleted",
        description: "Product has been deleted.",
      });
    }
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

  const handleReplaceMarket = (marketIndex: number, newMarket: any) => {
    console.log('🔍 handleReplaceMarket called:', { marketIndex, newMarket: newMarket.name });
    console.log('🔍 selectedMarkets before:', selectedMarkets.map(m => m.name));
    
    const updatedMarkets = [...selectedMarkets];
    updatedMarkets[marketIndex] = newMarket;
    setSelectedMarkets(updatedMarkets);
    
    console.log('🔍 selectedMarkets after update:', updatedMarkets.map(m => m.name));
    
    toast({
      title: "Market Replaced",
      description: `Replaced with ${newMarket.name}`,
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
        
        // Also update the selected markets if this market is currently selected
        setSelectedMarkets(prev => 
          prev.map(m => m.id === editingMarket.id ? updateData : m)
        );
        
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
        
        // Add the new market to selected markets if under the limit
        if (selectedMarkets.length < 3) {
          setSelectedMarkets(prev => [...prev, insertData]);
          setActiveMarketTab(selectedMarkets.length); // Set as active tab
        }
        
        toast({
          title: "Market Added",
          description: `${marketData.name} has been added and selected.`,
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex gap-6">
              <TabsList className="flex flex-col h-fit w-48 space-y-1 p-1">
                {shopData && (
                  <TabsTrigger value="overview2" className="w-full justify-start">Overview</TabsTrigger>
                )}
                <TabsTrigger value="overview" className="w-full justify-start">Shop</TabsTrigger>
                <TabsTrigger value="products-main" className="w-full justify-start">Products</TabsTrigger>
                {shopData && (
                  <TabsTrigger value="account" className="w-full justify-start">Account</TabsTrigger>
                )}
              </TabsList>

              <div className="flex-1 space-y-6">
                <TabsContent value="overview" className="space-y-6">
                  <div className="flex gap-4">
                    <Card className="flex-1">
                      <CardContent className="space-y-6 pt-8">
                        {/* Farmers Market Search */}
                        <div className="space-y-2">
                          <Label>Which farmers markets do you sell at? (Up to 3) *</Label>
                          <FarmersMarketSearch />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="store_name">Store Name *</Label>
                          <Input
                            id="store_name"
                            value={formData.store_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                            placeholder="Enter your store name"
                            disabled={shopData && !isEditMode}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="specialty">Primary Specialty *</Label>
                          <Select
                            value={formData.primary_specialty}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, primary_specialty: value }))}
                            disabled={shopData && !isEditMode}
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
                            disabled={shopData && !isEditMode}
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
                            disabled={shopData && !isEditMode}
                          />
                        </div>

                        {/* Continue Button for new submissions */}
                        {!shopData && (
                          <div className="pt-6 border-t">
                            <Button 
                              onClick={() => setActiveTab('products-main')}
                              className="w-full"
                              size="lg"
                            >
                              Continue to Products
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                  </Card>

                   {/* Edit Button positioned to the right of the card */}
                   {shopData && (
                     <div className="flex justify-center">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           if (isEditMode) {
                             // If currently editing, save the changes
                             handleSubmit();
                             setIsEditMode(false);
                           } else {
                             // If starting to edit, save current form data as backup
                             setOriginalFormData({ ...formData });
                             setIsEditMode(true);
                           }
                         }}
                         disabled={isSubmitting}
                       >
                         {isEditMode ? (
                           <>
                             <Save className="h-4 w-4 mr-2" />
                             {isSubmitting ? 'Saving...' : 'Save'}
                           </>
                         ) : (
                           <>
                             <Edit className="h-4 w-4 mr-2" />
                             Edit
                           </>
                         )}
                       </Button>
                     </div>
                   )}
                  </div>
                </TabsContent>

                <TabsContent value="products-main" className="space-y-6">
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
                      
                      {/* Publish Market Button for new submissions */}
                      {!shopData && (
                        <div className="pt-6 border-t mt-6">
                          <div className="text-center space-y-4">
                            <p className="text-muted-foreground">
                              Ready to publish your market? You can always add more products later.
                            </p>
                            <Button 
                              onClick={handleSubmit}
                              disabled={isSubmitting}
                              size="lg"
                              className="w-full max-w-md"
                            >
                              {isSubmitting ? 'Publishing...' : 'Publish Your Market'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </TabsContent>

                <TabsContent value="overview2" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">
                          Total orders received
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">${analytics.revenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                          Total revenue earned
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Shop Views</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{products.length}</div>
                        <p className="text-xs text-muted-foreground">
                          Products available
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {analytics.reviewCount > 0 ? analytics.averageRating.toFixed(1) : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Based on {analytics.reviewCount} reviews
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {analytics.recentOrders.length > 0 ? (
                          analytics.recentOrders.map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">Order #{order.id.slice(-8)}</p>
                                <p className="text-sm text-muted-foreground">{order.email}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${(order.total_amount / 100).toFixed(2)}</p>
                                <p className="text-sm capitalize">{order.status}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No orders yet
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Top Selling Products</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {analytics.topProducts.length > 0 ? (
                          analytics.topProducts.map((product: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">Product</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{product.count} sold</p>
                                <p className="text-sm text-muted-foreground">${(product.price / 100).toFixed(2)} each</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No sales data yet
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{products.length}</div>
                          <p className="text-sm text-muted-foreground">Products Listed</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{selectedMarkets.length}</div>
                          <p className="text-sm text-muted-foreground">Markets Active</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">89%</div>
                          <p className="text-sm text-muted-foreground">Order Success Rate</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">2.3</div>
                          <p className="text-sm text-muted-foreground">Avg. Items/Order</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="account" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Store Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">Vacation Mode</h3>
                          <p className="text-sm text-muted-foreground">
                            Temporarily hide your store from customers
                          </p>
                        </div>
                        <Switch
                          checked={shopData?.vacation_mode || false}
                          onCheckedChange={async (checked) => {
                            if (!user || !shopData) return;
                            
                            try {
                              const { error } = await supabase
                                .from('submissions')
                                .update({ 
                                  vacation_mode: checked,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', shopData.id);

                              if (error) throw error;

                              setShopData(prev => prev ? {...prev, vacation_mode: checked} : null);
                              
                              toast({
                                title: checked ? "Vacation Mode Enabled" : "Vacation Mode Disabled",
                                description: checked 
                                  ? "Your store is now hidden from customers"
                                  : "Your store is now visible to customers"
                              });
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description: "Failed to update vacation mode",
                                variant: "destructive"
                              });
                            }
                          }}
                        />
                      </div>

                      <div className="p-4 border border-destructive rounded-lg bg-destructive/5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-destructive">Delete Store</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Permanently delete your store and all associated data. This action cannot be undone.
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            onClick={async () => {
                              if (!user || !shopData) return;
                              
                              if (!confirm('Are you sure you want to delete your store? This action cannot be undone.')) {
                                return;
                              }
                              
                              try {
                                const { error } = await supabase
                                  .from('submissions')
                                  .delete()
                                  .eq('id', shopData.id);

                                if (error) throw error;

                                setShopData(null);
                                setProducts([]);
                                setSelectedMarkets([]);
                                setFormData({
                                  store_name: '',
                                  primary_specialty: '',
                                  website: '',
                                  description: '',
                                });
                                
                                toast({
                                  title: "Store Deleted",
                                  description: "Your store has been permanently deleted"
                                });
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: "Failed to delete store",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            Delete Store
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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