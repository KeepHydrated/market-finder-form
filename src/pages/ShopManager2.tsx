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
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';

interface ShopData {
  id: string;
  store_name: string;
  store_description?: string;
  store_website?: string;
  contact_email: string;
  delivery_options: string;
  delivery_radius?: string;
  farmers_markets: any[];
  vacation_mode?: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string[];
}

interface Analytics {
  totalOrders: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  recentOrders: any[];
  topProducts: any[];
}

export default function ShopManager() {
  console.log("ShopManager component rendering...");
  
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const isSavingRef = useRef(false);
  
  const urlParams = new URLSearchParams(location.search);
  const currentSection = urlParams.get('section') || 'products';
  
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingShop, setLoadingShop] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalOrders: 0,
    revenue: 0,
    averageRating: 0,
    reviewCount: 0,
    recentOrders: [],
    topProducts: []
  });

  const [selectedFarmersMarkets, setSelectedFarmersMarkets] = useState<any[]>([]);
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeWebsite, setStoreWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [deliveryOptions, setDeliveryOptions] = useState('pickup_only');
  const [deliveryRadius, setDeliveryRadius] = useState('');
  const [vacationMode, setVacationMode] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [shopData]);

  useEffect(() => {
    // Auto-navigate to products by default
    if (!isSavingRef.current) {
      const newSection = currentSection === 'shop' || currentSection === 'overview' ? 'products' : currentSection;
      if (newSection !== currentSection) {
        navigate(`/submit?section=${newSection}`, { replace: true });
      }
    } else {
      isSavingRef.current = false;
    }
  }, [navigate, currentSection]);

  const fetchShopData = async () => {
    if (!user) return;

    try {
      setLoadingShop(true);
      console.log("Fetching shop data for user:", user.id);
      
      const { data, error } = await supabase
        .from('accepted_submissions' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log("No shop data found");
          setShopData(null);
        } else {
          console.error('Error fetching shop data:', error);
          throw error;
        }
      } else {
        console.log("Shop data found:", data);
        setShopData(data as any);
        
        // Populate form fields
        const shopDataTyped = data as any;
        setStoreName(shopDataTyped.store_name || '');
        setStoreDescription(shopDataTyped.store_description || '');
        setStoreWebsite(shopDataTyped.store_website || '');
        setContactEmail(shopDataTyped.contact_email || '');
        setDeliveryOptions(shopDataTyped.delivery_options || 'pickup_only');
        setDeliveryRadius(shopDataTyped.delivery_radius || '');
        setVacationMode(shopDataTyped.vacation_mode || false);
        setSelectedFarmersMarkets(shopDataTyped.farmers_markets || []);
        
        // Fetch products
        if (shopDataTyped.products) {
          setProducts(shopDataTyped.products);
        }
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
      toast({
        title: "Error",
        description: "Failed to load shop data",
        variant: "destructive",
      });
    } finally {
      setLoadingShop(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!shopData) return;

    try {
      // Fetch orders analytics
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', shopData.id);

      if (ordersError) throw ordersError;

      // Calculate analytics
      const totalOrders = orders?.length || 0;
      const revenue = orders?.reduce((sum, order) => sum + (order.total_amount / 100), 0) || 0;
      const recentOrders = orders?.slice(-5) || [];

      // Fetch reviews for ratings
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('vendor_id', shopData.id);

      if (reviewsError) throw reviewsError;

      const reviewCount = reviews?.length || 0;
      const averageRating = reviewCount > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount 
        : 0;

      // Calculate top products (simplified - would need order items table)
      const topProducts: any[] = [];

      setAnalytics({
        totalOrders,
        revenue,
        averageRating,
        reviewCount,
        recentOrders,
        topProducts
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchShopData();
    }
  }, [user]);

  const handleSaveShop = async () => {
    if (!user || !storeName || !contactEmail) return;

    try {
      setIsSubmitting(true);
      isSavingRef.current = true;

      const shopDataToSave = {
        user_id: user.id,
        store_name: storeName,
        store_description: storeDescription,
        store_website: storeWebsite,
        contact_email: contactEmail,
        delivery_options: deliveryOptions,
        delivery_radius: deliveryRadius,
        farmers_markets: selectedFarmersMarkets,
        products: products as any,
        vacation_mode: vacationMode,
        status: 'accepted'
      };

      let result;
      if (shopData) {
        // Update existing
        result = await supabase
          .from('accepted_submissions' as any)
          .update(shopDataToSave)
          .eq('id', shopData.id)
          .select()
          .single();
      } else {
        // Create new
        result = await supabase
          .from('accepted_submissions' as any)
          .insert(shopDataToSave)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setShopData(result.data);
      setIsEditMode(false);
      
      toast({
        title: "Success",
        description: `Shop ${shopData ? 'updated' : 'created'} successfully`,
      });

    } catch (error) {
      console.error('Error saving shop:', error);
      toast({
        title: "Error",
        description: `Failed to ${shopData ? 'update' : 'create'} shop`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProduct = (newProduct: Product) => {
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    updateProductsInDB(updatedProducts);
  };

  const handleDeleteProduct = (id: number) => {
    const updatedProducts = products.filter(p => p.id !== id);
    setProducts(updatedProducts);
    updateProductsInDB(updatedProducts);
  };

  const handleDuplicateProduct = (product: Product) => {
    const newProduct = {
      ...product,
      id: Date.now(),
      name: `${product.name} (Copy)`
    };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    updateProductsInDB(updatedProducts);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowAddProduct(true);
  };

  const updateProductsInDB = async (updatedProducts: Product[]) => {
    if (shopData) {
      try {
        await supabase
          .from('accepted_submissions' as any)
          .update({ products: updatedProducts as any })
          .eq('id', shopData.id);
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
              <span className="text-sm text-muted-foreground">
                {products.length} product{products.length !== 1 ? 's' : ''}
              </span>
            )}
            <Button
              onClick={() => setShowAddProduct(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <ProductGrid 
              products={products}
              onDeleteProduct={handleDeleteProduct}
              onDuplicateProduct={handleDuplicateProduct}
              onEditProduct={handleEditProduct}
              vendorId={shopData?.id}
              vendorName={shopData?.store_name}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <Plus className="h-12 w-12 mx-auto text-muted-foreground/50" />
              </div>
              <p className="mb-2">No products yet</p>
              <p className="text-sm">Add your first product to get started</p>
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
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vacation-mode">Vacation Mode</Label>
              <p className="text-sm text-muted-foreground">
                Hide your store from customers temporarily
              </p>
            </div>
            <Switch
              id="vacation-mode"
              checked={vacationMode}
              onCheckedChange={async (checked) => {
                setVacationMode(checked);
                
                if (!shopData) return;
                
                try {
                  await supabase
                    .from('accepted_submissions' as any)
                    .update({ vacation_mode: checked })
                    .eq('id', shopData.id);
                  
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
          <header className="h-16 flex items-center border-b px-6">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold ml-4">Shop Manager</h1>
          </header>
          
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>

      {showAddProduct && (
        <AddProductForm
          open={showAddProduct}
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