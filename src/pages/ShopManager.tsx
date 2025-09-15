import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Store, Package, ShoppingCart, DollarSign, Edit, Plus, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { ProductGrid } from '@/components/ProductGrid';
import { AddProductForm } from '@/components/AddProductForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ShopData {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any[];
  selected_market: string;
  search_term: string;
  market_address?: string;
  market_days?: string[];
  market_hours?: any; // Changed from Record to any for flexibility
  status: string;
}

interface Order {
  id: string;
  email: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    store_name: '',
    primary_specialty: '',
    website: '',
    description: '',
  });

  useEffect(() => {
    if (user) {
      fetchShopData();
    }
  }, [user]);

  useEffect(() => {
    if (shopData) {
      fetchOrders();
    }
  }, [shopData]);

  const fetchShopData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching shop data:', error);
        return;
      }

      if (data) {
        const parsedData = {
          ...data,
          products: typeof data.products === 'string' ? JSON.parse(data.products) : data.products || [],
        };
        setShopData(parsedData);
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

  const fetchOrders = async () => {
    if (!user || !shopData) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          email,
          total_amount,
          status,
          created_at,
          order_items (
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('vendor_id', shopData.id) // Use shop ID instead of user ID
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSaveShop = async () => {
    if (!user || !shopData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          store_name: formData.store_name,
          primary_specialty: formData.primary_specialty,
          website: formData.website,
          description: formData.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopData.id);

      if (error) throw error;

      toast({
        title: "Shop Updated",
        description: "Your shop information has been successfully updated.",
      });

      setIsEditing(false);
      fetchShopData(); // Refresh data
    } catch (error: any) {
      console.error('Error updating shop:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update shop information.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = (product: any) => {
    if (!shopData) return;

    const updatedProducts = [...(shopData.products || []), { ...product, id: Date.now() }];
    updateProducts(updatedProducts);
    setShowAddProduct(false);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setShowAddProduct(true);
  };

  const handleUpdateProduct = (updatedProduct: any) => {
    if (!shopData) return;

    const updatedProducts = shopData.products.map(p => 
      p.id === updatedProduct.id ? updatedProduct : p
    );
    updateProducts(updatedProducts);
    setShowAddProduct(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: number) => {
    if (!shopData) return;

    const updatedProducts = shopData.products.filter(p => p.id !== productId);
    updateProducts(updatedProducts);
  };

  const handleDuplicateProduct = (product: any) => {
    if (!shopData) return;

    const newProduct = {
      ...product,
      id: Date.now(),
      name: `${product.name} (Copy)`
    };
    const updatedProducts = [newProduct, ...shopData.products];
    updateProducts(updatedProducts);
  };

  const updateProducts = async (products: any[]) => {
    if (!shopData || !user) return;

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          products: JSON.stringify(products),
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopData.id);

      if (error) throw error;

      setShopData(prev => prev ? { ...prev, products } : null);
      
      toast({
        title: "Products Updated",
        description: "Your product list has been updated.",
      });
    } catch (error: any) {
      console.error('Error updating products:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update products.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getTotalRevenue = () => {
    return orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + order.total_amount, 0);
  };

  const getTotalOrders = () => {
    return orders.filter(order => order.status === 'completed').length;
  };

  if (loading || loadingShop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to manage your shop.
            </p>
            <AuthForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Shop Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You don't have an approved shop yet. Please complete the vendor application process first.
            </p>
            <Button onClick={() => window.location.href = '/profile'}>
              Go to Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="shop">Shop Details</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(getTotalRevenue())}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getTotalOrders()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{shopData.products?.length || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="text-center py-8">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders yet. Orders will appear here once customers start purchasing your products.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-medium">Order #{order.id.slice(0, 8)}...</p>
                              <p className="text-sm text-muted-foreground">{order.email}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatPrice(order.total_amount)}</p>
                              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <Separator className="my-3" />
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Items:</p>
                            {order.order_items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.quantity}x {item.product_name}</span>
                                <span>{formatPrice(item.total_price)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="shop" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Shop Information</CardTitle>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => {
                    if (isEditing) {
                      setFormData({
                        store_name: shopData.store_name || '',
                        primary_specialty: shopData.primary_specialty || '',
                        website: shopData.website || '',
                        description: shopData.description || '',
                      });
                    }
                    setIsEditing(!isEditing);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store_name">Store Name</Label>
                  <Input
                    id="store_name"
                    value={formData.store_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty">Primary Specialty</Label>
                  <Select
                    value={formData.primary_specialty}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, primary_specialty: value }))}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={!isEditing}
                    rows={4}
                  />
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveShop} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Management</CardTitle>
                <Button onClick={() => setShowAddProduct(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardHeader>
              <CardContent>
                <ProductGrid
                  products={shopData.products || []}
                  onDeleteProduct={handleDeleteProduct}
                  onDuplicateProduct={handleDuplicateProduct}
                  onEditProduct={handleEditProduct}
                  vendorId={shopData.id}
                  vendorName={shopData.store_name}
                />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
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
    </div>
  );
}