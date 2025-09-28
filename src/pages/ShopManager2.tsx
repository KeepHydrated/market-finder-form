import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { ProductGrid } from '@/components/ProductGrid';
import { AddProductForm } from '@/components/AddProductForm';
import { FarmersMarketSearch } from '@/components/FarmersMarketSearch';
import { ShopSidebar } from '@/components/ShopSidebar';
import { VendorOrders } from '@/components/VendorOrders';
import { SidebarProvider } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';

interface ShopData {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any[];
  selected_markets: any[];
  search_term: string;
  market_address?: string;
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
  console.log("ShopManager component rendering...");
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get current section from URL params
  const urlParams = new URLSearchParams(location.search);
  const currentSection = urlParams.get('section') || 'shop';
  
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingShop, setLoadingShop] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<any>(null);
  const isSavingRef = useRef(false);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    revenue: 0,
    shopViews: 0,
    averageRating: 0,
    reviewCount: 0,
    recentOrders: [],
    topProducts: [],
    orderSuccessRate: 0,
    avgItemsPerOrder: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    store_name: '',
    primary_specialty: '',
    website: '',
    description: '',
  });

  const [products, setProducts] = useState<any[]>([]);
  const [selectedFarmersMarkets, setSelectedFarmersMarkets] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchShopData();
    }
  }, [user]);

  useEffect(() => {
    if (shopData) {
      fetchAnalytics();
    }
  }, [shopData]);

  useEffect(() => {
    // Auto-navigate based on shop data existence
    if (!isSavingRef.current) {
      const newSection = shopData ? currentSection : 'products';
      if (newSection !== currentSection) {
        navigate(`/submit?section=${newSection}`, { replace: true });
      }
    } else {
      isSavingRef.current = false;
    }
  }, [shopData, navigate, currentSection]);

  const fetchShopData = async () => {
    if (!user) return;

    try {
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
        setProducts(parsedData.products || []);
        
        const farmersMarkets = (parsedData.selected_markets || []).map((marketName: string, index: number) => ({
          place_id: `saved-${index}-${marketName.replace(/\s+/g, '-').toLowerCase()}`,
          name: marketName,
          address: '',
          structured_formatting: {
            main_text: marketName,
            secondary_text: ''
          }
        }));
        setSelectedFarmersMarkets(farmersMarkets);
        
        setFormData({
          store_name: parsedData.store_name || '',
          primary_specialty: parsedData.primary_specialty || '',
          website: parsedData.website || '',
          description: parsedData.description || '',
        });
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoadingShop(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!shopData) return;

    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('vendor_id', shopData.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('vendor_id', shopData.id);

      if (reviewsError) throw reviewsError;

      const totalOrders = orders?.length || 0;
      const revenue = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const averageRating = reviews?.length ? 
        reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
      
      const completedOrders = orders?.filter(order => order.status === 'completed').length || 0;
      const orderSuccessRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      
      const totalItems = orders?.reduce((sum, order) => {
        return sum + (order.order_items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0);
      }, 0) || 0;
      const avgItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;

      const recentOrders = orders?.slice(0, 5) || [];

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
        revenue: revenue / 100,
        shopViews: 0,
        averageRating,
        reviewCount: reviews?.length || 0,
        recentOrders,
        topProducts,
        orderSuccessRate,
        avgItemsPerOrder
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

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

    if (selectedFarmersMarkets.length === 0) {
      toast({
        title: "Market Required", 
        description: "Please select at least one farmers market.",
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
        selected_markets: selectedFarmersMarkets.map(m => m.name),
        search_term: selectedFarmersMarkets.length > 0 ? selectedFarmersMarkets[0].name : '',
        market_address: selectedFarmersMarkets.length > 0 && selectedFarmersMarkets[0].address 
          ? selectedFarmersMarkets[0].address 
          : (shopData?.market_address || ''),
        status: 'accepted'
      };

      if (shopData) {
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
        const { error } = await supabase
          .from('submissions')
          .insert([submissionData]);

        if (error) throw error;

        toast({
          title: "Submission Created",
          description: "Your submission has been created and is pending review.",
        });
      }

      if (currentSection === 'shop') {
        isSavingRef.current = true;
      }
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

  const handleAddProduct = async (product: any) => {
    const updatedProducts = [...products, { ...product, id: Date.now() }];
    setProducts(updatedProducts);
    setShowAddProduct(false);

    if (shopData) {
      try {
        await supabase
          .from('submissions')
          .update({
            products: updatedProducts,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shopData.id);
        
        toast({
          title: "Product Added",
          description: "Your product has been added successfully.",
        });
      } catch (error) {
        console.error('Error updating products:', error);
      }
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);

    if (shopData) {
      try {
        await supabase
          .from('submissions')
          .update({
            products: updatedProducts,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shopData.id);
        
        toast({
          title: "Product Deleted",
          description: "Your product has been deleted successfully.",
        });
      } catch (error) {
        console.error('Error updating products:', error);
      }
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setShowAddProduct(true);
  };

  const handleDuplicateProduct = async (product: any) => {
    const duplicatedProduct = {
      ...product,
      id: Date.now(),
      name: `${product.name} (Copy)`
    };
    
    const updatedProducts = [...products, duplicatedProduct];
    setProducts(updatedProducts);

    if (shopData) {
      try {
        await supabase
          .from('submissions')
          .update({
            products: updatedProducts,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shopData.id);
        
        toast({
          title: "Product Duplicated",
          description: "Your product has been duplicated successfully.",
        });
      } catch (error) {
        console.error('Error updating products:', error);
      }
    }
  };

  const handleDeleteAllProducts = async () => {
    if (!confirm('Are you sure you want to delete all products? This action cannot be undone.')) {
      return;
    }

    setProducts([]);

    if (shopData) {
      try {
        await supabase
          .from('submissions')
          .update({
            products: [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', shopData.id);
        
        toast({
          title: "All Products Deleted",
          description: "All your products have been deleted successfully.",
        });
      } catch (error) {
        console.error('Error updating products:', error);
      }
    }
  };

  const renderContent = () => {
    console.log("Rendering content for section:", currentSection);
    switch (currentSection) {
      case 'products':
        return renderProducts();
      case 'orders':
        return <VendorOrders vendorId={shopData?.id} />;
      case 'account':
        return renderAccount();
      case 'test':
        return renderTest();
      default:
        return renderProducts();
    }
  };


  const renderShop = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Shop Setup</h2>
        <p className="text-muted-foreground">Configure your farmers market shop details</p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-8">
          <div className="space-y-2">
            <Label>Which farmers markets do you sell at? (Up to 3) *</Label>
            <FarmersMarketSearch 
              selectedMarkets={selectedFarmersMarkets} 
              onMarketsChange={setSelectedFarmersMarkets}
              isEditing={!shopData || isEditMode}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="store_name">Store Name *</Label>
            <Input
              id="store_name"
              value={formData.store_name}
              onChange={(e) => {
                const value = e.target.value;
                const limitedValue = value.length > 20 ? value.slice(0, 20) : value;
                setFormData(prev => ({ ...prev, store_name: limitedValue }));
              }}
              placeholder="Enter your store name"
              disabled={shopData && !isEditMode}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Category *</Label>
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

          <div className="pt-6 border-t flex gap-4">
            {shopData && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (isEditMode) {
                    if (currentSection === 'shop') {
                      isSavingRef.current = true;
                    }
                    await handleSubmit();
                    setIsEditMode(false);
                  } else {
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
            )}

            {!shopData && (
              <Button 
                onClick={() => navigate('/submit?section=products')}
                className="flex-1"
              >
                Continue to Products
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Products</h2>
        <p className="text-muted-foreground">Manage your product catalog</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Product Catalog</CardTitle>
          <div className="flex items-center gap-2">
            {products.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteAllProducts}
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            )}
            <Button onClick={() => setShowAddProduct(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
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
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Account Settings</h2>
        <p className="text-muted-foreground">Manage your shop settings and preferences</p>
      </div>

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
                  
                  setShopData(prev => prev ? { ...prev, vacation_mode: checked } : null);
                  
                  toast({
                    title: checked ? "Vacation Mode Enabled" : "Vacation Mode Disabled",
                    description: checked 
                      ? "Your store is now hidden from customers" 
                      : "Your store is now visible to customers",
                  });
                } catch (error) {
                  console.error('Error updating vacation mode:', error);
                  toast({
                    title: "Update Failed",
                    description: "Failed to update vacation mode",
                    variant: "destructive",
                  });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTest = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Test</h2>
        <p className="text-muted-foreground">Your shop performance at a glance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Total orders received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total revenue earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Products available</p>
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
            <p className="text-xs text-muted-foreground">Based on {analytics.reviewCount} reviews</p>
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
              <div className="text-center py-4 text-muted-foreground">No orders yet</div>
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
              <div className="text-center py-4 text-muted-foreground">No sales data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (loading || loadingShop) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Create Your Shop</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-6">
              Sign in to create and manage your farmers market shop.
            </p>
            <AuthForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ShopSidebar hasShopData={!!shopData} />
        
        <main className="flex-1">
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Product Form Modal */}
      {showAddProduct && (
        <AddProductForm
          open={showAddProduct}
          editingProduct={editingProduct}
          onClose={() => {
            setShowAddProduct(false);
            setEditingProduct(null);
          }}
          onProductAdded={handleAddProduct}
        />
      )}
    </SidebarProvider>
  );
}