import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, Plus, Trash2, ArrowRight, Package, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { ProductGrid } from '@/components/ProductGrid';
import { AddProductForm } from '@/components/AddProductForm';
import { FarmersMarketSearch } from '@/components/FarmersMarketSearch';
import { ShopSidebar } from '@/components/ShopSidebar';
import { VendorOrders } from '@/components/VendorOrders';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { formatDistanceToNow, addDays, differenceInHours, isPast } from 'date-fns';

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
    avgItemsPerOrder: 0,
    lastOrderTime: null as Date | null,
    lastRevenueTime: null as Date | null
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (!isSavingRef.current && !loadingShop) {
      const newSection = shopData ? currentSection : 'overview';
      if (newSection !== currentSection) {
        navigate(`/my-shop?section=${newSection}`, { replace: true });
      }
    } else if (isSavingRef.current) {
      isSavingRef.current = false;
    }
  }, [shopData, navigate, loadingShop]);

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
        avgItemsPerOrder,
        lastOrderTime: orders && orders.length > 0 ? new Date(orders[0].created_at) : null,
        lastRevenueTime: orders && orders.length > 0 ? new Date(orders[0].created_at) : null
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


  const handleDuplicateProduct = async (product: any) => {
    const duplicatedProduct = {
      ...product,
      id: Date.now()
    };
    
    const updatedProducts = [duplicatedProduct, ...products];
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

  const handleEditProduct = async (product: any) => {
    const updatedProducts = products.map(p => 
      p.id === product.id ? product : p
    );
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
          title: "Product Updated",
          description: "Your product has been updated successfully.",
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
      case 'overview':
        return shopData ? renderOverviewWithTabs() : renderShop();
      case 'setup':
        return renderShop();
      case 'products':
        return renderProducts();
      case 'orders2':
        return (
          <div className="space-y-6 ml-52 mr-8 max-w-6xl pt-[40px] pb-4">
            <VendorOrders vendorId={shopData?.id} vendorName={shopData?.store_name} />
          </div>
        );
      case 'account':
        return renderAccount();
      default:
        return shopData ? renderOverviewWithTabs() : renderShop();
    }
  };

  const renderOverviewWithTabs = () => (
    <div className="space-y-6 ml-52 mr-8 max-w-7xl pt-[40px] pb-4">
      {renderTest()}
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-8">
          {/* Store Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h1 className="text-4xl font-bold">{formData.store_name || 'Your Store Name'}</h1>
              {analytics.reviewCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(analytics.averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xl font-semibold">{analytics.averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({analytics.reviewCount})</span>
                </div>
              )}
            </div>

            {/* Specialty Badge */}
            {formData.primary_specialty && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-base px-4 py-1">
                {formData.primary_specialty}
              </Badge>
            )}

            {/* Description */}
            {formData.description && (
              <p className="text-muted-foreground text-lg">{formData.description}</p>
            )}

            {/* Website */}
            {formData.website && (
              <a 
                href={formData.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 text-lg font-medium inline-block"
              >
                {formData.website}
              </a>
            )}

            {/* Markets */}
            {selectedFarmersMarkets.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Available at:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedFarmersMarkets.map((market, index) => (
                    <Badge key={index} variant="outline">
                      {market.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      {products.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                {product.images && product.images.length > 0 && (
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{product.description}</p>
                  <p className="text-lg font-bold mt-2">${(product.price / 100).toFixed(2)}</p>
                  {product.unit && (
                    <p className="text-sm text-muted-foreground">per {product.unit}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No products added yet. Add products in the Setup tab to see them here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );


  const renderShop = () => (
    <div className="space-y-6 ml-52 mr-8 max-w-3xl pt-[40px] pb-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Configure your farmers market shop details</h2>
        </div>
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
      </div>
      
      <Card>
        <CardContent className="space-y-6 pt-6">
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
    <div className="space-y-6 ml-52 mr-8 max-w-3xl pt-[40px] pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Manage your product listings</h2>
        </div>

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
      </div>
      
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
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-6 ml-52 mr-8 max-w-3xl pt-[40px] pb-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Manage your shop settings and preferences</h2>
      </div>

      <Card className="w-full">
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

      <Card className="border-destructive w-full">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
            <div>
              <h3 className="font-medium">Delete Store</h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete your store and all associated data
              </p>
            </div>
            <Button 
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Store
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your store and remove all your products, orders, and store information from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={async () => {
                if (!user || !shopData || isDeleting) return;
                
                setIsDeleting(true);
                
                try {
                  console.log('Starting deletion for shop:', shopData.id);
                  
                  // Step 1: Get and delete all conversations and their messages
                  const { data: conversations } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('vendor_id', shopData.id);
                  
                  console.log('Found conversations:', conversations?.length || 0);
                  
                  if (conversations && conversations.length > 0) {
                    const conversationIds = conversations.map(c => c.id);
                    
                    // Delete messages
                    const { error: msgError } = await supabase
                      .from('messages')
                      .delete()
                      .in('conversation_id', conversationIds);
                    
                    if (msgError) {
                      console.error('Error deleting messages:', msgError);
                      throw new Error('Failed to delete messages');
                    }
                    
                    // Delete conversations by ID (not vendor_id to avoid FK issues)
                    const { error: convError } = await supabase
                      .from('conversations')
                      .delete()
                      .in('id', conversationIds);
                    
                    if (convError) {
                      console.error('Error deleting conversations:', convError);
                      throw new Error('Failed to delete conversations');
                    }
                    
                    console.log('Deleted conversations and messages');
                  }
                  
                  // Step 2: Delete reviews
                  const { error: reviewError } = await supabase
                    .from('reviews')
                    .delete()
                    .eq('vendor_id', shopData.id);
                  
                  if (reviewError) {
                    console.error('Error deleting reviews:', reviewError);
                  }
                  
                  // Step 3: Delete likes
                  const { error: likeError } = await supabase
                    .from('likes')
                    .delete()
                    .eq('item_id', shopData.id);
                  
                  if (likeError) {
                    console.error('Error deleting likes:', likeError);
                  }
                  
                  // Step 4: Get and delete orders
                  const { data: orders } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('vendor_id', shopData.id);
                  
                  console.log('Found orders:', orders?.length || 0);
                  
                  if (orders && orders.length > 0) {
                    const orderIds = orders.map(o => o.id);
                    
                    // Delete order items
                    const { error: orderItemsError } = await supabase
                      .from('order_items')
                      .delete()
                      .in('order_id', orderIds);
                    
                    if (orderItemsError) {
                      console.error('Error deleting order items:', orderItemsError);
                    }
                    
                    // Delete commissions
                    const { error: commError } = await supabase
                      .from('commissions')
                      .delete()
                      .eq('vendor_id', shopData.id);
                    
                    if (commError) {
                      console.error('Error deleting commissions:', commError);
                    }
                    
                    // Delete orders
                    const { error: orderError } = await supabase
                      .from('orders')
                      .delete()
                      .in('id', orderIds);
                    
                    if (orderError) {
                      console.error('Error deleting orders:', orderError);
                    }
                    
                    console.log('Deleted orders and related data');
                  }
                  
                  // Step 5: Finally delete the submission
                  console.log('Attempting to delete submission');
                  const { error: subError } = await supabase
                    .from('submissions')
                    .delete()
                    .eq('id', shopData.id)
                    .eq('user_id', user.id);

                  if (subError) {
                    console.error('Error deleting submission:', subError);
                    throw new Error('Failed to delete store: ' + subError.message);
                  }
                  
                  console.log('Successfully deleted submission');
                  
                  setShopData(null);
                  setProducts([]);
                  setSelectedFarmersMarkets([]);
                  setFormData({
                    store_name: '',
                    primary_specialty: '',
                    website: '',
                    description: '',
                  });
                  
                  toast({
                    title: "Store Deleted",
                    description: "Your store has been permanently deleted",
                  });
                  
                  setShowDeleteDialog(false);
                  navigate('/submit?section=setup');
                } catch (error) {
                  console.error('Error deleting store:', error);
                  toast({
                    title: "Delete Failed",
                    description: error instanceof Error ? error.message : "Failed to delete your store",
                    variant: "destructive",
                  });
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete Store'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const renderTest = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Stats</h2>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <Select defaultValue="7days">
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 divide-x-0 md:divide-x divide-border">
            <div className="space-y-1">
              <p className="text-sm font-medium">Total Views</p>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">--% YoY</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <span className="inline-block w-3 h-3 rounded-full border border-muted-foreground"></span>
                Just now
              </p>
            </div>

            <div className="space-y-1 md:pl-6">
              <p className="text-sm font-medium">Visits</p>
              <p className="text-2xl font-bold">2</p>
              <p className="text-xs text-muted-foreground">--% YoY</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <span className="inline-block w-3 h-3 rounded-full border border-muted-foreground"></span>
                6 hours ago
              </p>
            </div>

            <div className="space-y-1 md:pl-6">
              <p className="text-sm font-medium">Orders</p>
              <p className="text-2xl font-bold">{analytics.totalOrders}</p>
              <p className="text-xs text-muted-foreground">--% YoY</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <span className="inline-block w-3 h-3 rounded-full border border-muted-foreground"></span>
                {analytics.lastOrderTime 
                  ? formatDistanceToNow(analytics.lastOrderTime, { addSuffix: true })
                  : 'No data yet'}
              </p>
            </div>

            <div className="space-y-1 md:pl-6">
              <p className="text-sm font-medium">Revenue</p>
              <p className="text-2xl font-bold">${analytics.revenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">--% YoY</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <span className="inline-block w-3 h-3 rounded-full border border-muted-foreground"></span>
                {analytics.lastRevenueTime 
                  ? formatDistanceToNow(analytics.lastRevenueTime, { addSuffix: true })
                  : 'No data yet'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-xl font-bold mb-4 px-4">Recent Orders</h3>
        {analytics.recentOrders.length > 0 ? (
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <div className="flex gap-4 w-max px-4">
              {analytics.recentOrders.map((order: any) => {
                const firstItem = order.order_items?.[0];
                const shipByDate = addDays(new Date(order.created_at), 2); // 2 days to ship
                const hoursRemaining = differenceInHours(shipByDate, new Date());
                const isOverdue = isPast(shipByDate);
                const isShipped = order.status === 'shipped' || order.status === 'delivered';
                
                return (
                  <Card key={order.id} className="overflow-hidden w-64 flex-shrink-0">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted overflow-hidden">
                        {firstItem?.product_image ? (
                          <img 
                            src={firstItem.product_image} 
                            alt={firstItem.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <h4 className="text-base font-normal">
                          {firstItem?.product_name || `Order #${order.id.slice(-8)}`}
                        </h4>
                        <p className="text-base text-muted-foreground">
                          ${(order.total_amount / 100).toFixed(2)}
                        </p>
                        <div className={`text-xs px-2 py-1 rounded-md w-fit ${
                          isShipped
                            ? 'bg-green-500/10 text-green-600 dark:text-green-500'
                            : isOverdue 
                              ? 'bg-destructive/10 text-destructive' 
                              : hoursRemaining < 24 
                                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
                                : 'bg-muted text-muted-foreground'
                        }`}>
                          {isShipped
                            ? 'Shipped'
                            : isOverdue 
                              ? 'Ship ASAP' 
                              : hoursRemaining < 24 
                                ? `Ship in ${hoursRemaining}h`
                                : `Ship by ${formatDistanceToNow(shipByDate, { addSuffix: true })}`
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No orders yet</div>
        )}
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
        <AuthForm />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-screen bg-background overflow-x-hidden">
        <ShopSidebar hasShopData={!!shopData} />
        
        <main className="flex-1 w-full">
          {renderContent()}
        </main>
      </div>

      {/* Product Form Modal */}
      {showAddProduct && (
        <AddProductForm
          open={showAddProduct}
          onClose={() => {
            setShowAddProduct(false);
          }}
          onProductAdded={handleAddProduct}
        />
      )}
    </SidebarProvider>
  );
}