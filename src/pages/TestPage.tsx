import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Home, Settings, Users, BarChart3, FileText, Edit, Save, Plus, Trash2, ArrowRight, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "@/components/auth/AuthForm";
import { ProductGrid } from "@/components/ProductGrid";
import { AddProductForm } from "@/components/AddProductForm";
import { FarmersMarketSearch } from "@/components/FarmersMarketSearch";
import { VendorOrders } from "@/components/VendorOrders";
import { FloatingChat } from "@/components/FloatingChat";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, addDays, differenceInHours, isPast } from "date-fns";
import { Star } from "lucide-react";
import AccountSection from "@/components/settings/AccountSection";

interface ShopData {
  id: string;
  store_name: string;
  primary_specialty: string;
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

const menuItems = [
  { title: "Overview", section: "overview", icon: Home, requiresShop: true },
  { title: "Setup", section: "setup", icon: Settings, requiresShop: false },
  { title: "Products", section: "products", icon: FileText, requiresShop: false },
  { title: "Orders", section: "orders", icon: BarChart3, requiresShop: true },
  { title: "Account", section: "account", icon: Users, requiresShop: true },
];

export default function TestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(location.search);
  const currentSection = urlParams.get("section") || "setup";
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Shop state
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<any>(null);
  const isSavingRef = useRef(false);
  const previousSectionRef = useRef(currentSection);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatBuyerEmail, setChatBuyerEmail] = useState<string | null>(null);
  const [chatOrderItems, setChatOrderItems] = useState<any[]>([]);

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    revenue: 0,
    shopViews: 0,
    averageRating: 0,
    reviewCount: 0,
    recentOrders: [] as any[],
    topProducts: [] as any[],
    orderSuccessRate: 0,
    avgItemsPerOrder: 0,
    lastOrderTime: null as Date | null,
    lastRevenueTime: null as Date | null
  });

  // Form state
  const [formData, setFormData] = useState({
    store_name: '',
    primary_specialty: '',
    description: '',
  });

  const [products, setProducts] = useState<any[]>([]);
  const [selectedFarmersMarkets, setSelectedFarmersMarkets] = useState<any[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // Account form state
  const [accountFormData, setAccountFormData] = useState({ email: '', newEmail: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchShopData();
      setAccountFormData(prev => ({ ...prev, email: user.email || '' }));
      if (pendingSubmit) {
        setPendingSubmit(false);
        setTimeout(() => handleSubmit(), 100);
      }
    } else {
      setLoadingShop(false);
    }
  }, [user]);

  useEffect(() => {
    if (shopData) fetchAnalytics();
  }, [shopData]);

  useEffect(() => {
    if (!isSavingRef.current && !loadingShop) {
      const newSection = shopData ? currentSection : 'setup';
      if (newSection !== currentSection) {
        navigate(`/test?section=${newSection}`, { replace: true });
      }
    } else if (isSavingRef.current) {
      isSavingRef.current = false;
    }
  }, [shopData, navigate, loadingShop]);

  useEffect(() => {
    if (previousSectionRef.current === 'setup' && currentSection !== 'setup' && isEditMode) {
      setFormData(originalFormData);
      setIsEditMode(false);
    }
    previousSectionRef.current = currentSection;
  }, [currentSection, isEditMode, originalFormData]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentSection]);

  const fetchShopData = async () => {
    if (!user) { setLoadingShop(false); return; }
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) { console.error('Error fetching shop data:', error); setLoadingShop(false); return; }

      if (data) {
        const parsedData = {
          ...data,
          products: typeof data.products === 'string' ? JSON.parse(data.products) : data.products || [],
          selected_markets: (() => { try { return Array.isArray(data.selected_markets) ? data.selected_markets : []; } catch { return []; } })()
        };
        setShopData(parsedData);
        setProducts(parsedData.products || []);
        const farmersMarkets = (parsedData.selected_markets || []).map((market: any, index: number) => {
          if (typeof market === 'string') {
            return { place_id: `saved-${index}`, name: market, address: '', structured_formatting: { main_text: market, secondary_text: '' } };
          }
          return { place_id: market.place_id || `saved-${index}`, name: market.name, address: market.address || '', structured_formatting: { main_text: market.name, secondary_text: market.address || '' } };
        });
        setSelectedFarmersMarkets(farmersMarkets);
        setFormData({ store_name: parsedData.store_name || '', primary_specialty: parsedData.primary_specialty || '', description: parsedData.description || '' });
      }
    } catch (error) { console.error('Error fetching shop data:', error); }
    finally { setLoadingShop(false); }
  };

  const fetchAnalytics = async () => {
    if (!shopData) return;
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders').select(`*, order_items (*)`).eq('vendor_id', shopData.id).order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews').select('*').eq('vendor_id', shopData.id);
      if (reviewsError) throw reviewsError;

      const totalOrders = orders?.length || 0;
      const revenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
      const averageRating = reviews?.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
      const orderSuccessRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      const totalItems = orders?.reduce((sum, o) => sum + (o.order_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0), 0) || 0;
      const avgItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;
      const recentOrders = orders?.slice(0, 5) || [];

      const productSales: Record<string, { name: string; count: number; price: number }> = {};
      orders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          if (!productSales[item.product_name]) productSales[item.product_name] = { name: item.product_name, count: 0, price: item.unit_price };
          productSales[item.product_name].count += item.quantity;
        });
      });
      const topProducts = Object.values(productSales).sort((a, b) => b.count - a.count).slice(0, 5);

      setAnalytics({
        totalOrders, revenue: revenue / 100, shopViews: 0, averageRating, reviewCount: reviews?.length || 0,
        recentOrders, topProducts, orderSuccessRate, avgItemsPerOrder,
        lastOrderTime: orders && orders.length > 0 ? new Date(orders[0].created_at) : null,
        lastRevenueTime: orders && orders.length > 0 ? new Date(orders[0].created_at) : null
      });
    } catch (error) { console.error('Error fetching analytics:', error); }
  };

  const handleSubmit = async () => {
    if (!user) { setPendingSubmit(true); setShowAuthModal(true); return; }
    if (!formData.store_name.trim()) { toast({ title: "Store Name Required", description: "Please enter a store name.", variant: "destructive" }); return; }
    if (!formData.primary_specialty) { toast({ title: "Specialty Required", description: "Please select a primary specialty.", variant: "destructive" }); return; }
    if (selectedFarmersMarkets.length === 0) { toast({ title: "Market Required", description: "Please select at least one farmers market.", variant: "destructive" }); return; }

    setIsSubmitting(true);
    try {
      const submissionData = {
        user_id: user.id,
        store_name: formData.store_name.trim(),
        primary_specialty: formData.primary_specialty,
        description: formData.description.trim(),
        products: products,
        selected_markets: selectedFarmersMarkets.map(m => ({ name: m.name, address: m.address || '', place_id: m.place_id })),
        search_term: selectedFarmersMarkets.length > 0 ? selectedFarmersMarkets[0].name : '',
        market_address: selectedFarmersMarkets.length > 0 && selectedFarmersMarkets[0].address ? selectedFarmersMarkets[0].address : (shopData?.market_address || ''),
        status: 'accepted'
      };

      if (shopData) {
        const { error } = await supabase.from('submissions').update({ ...submissionData, updated_at: new Date().toISOString() }).eq('id', shopData.id);
        if (error) throw error;
        toast({ title: "Submission Updated", description: "Your submission has been updated successfully." });
      } else {
        const { error } = await supabase.from('submissions').insert([submissionData]);
        if (error) throw error;
        toast({ title: "Published to Store", description: "Congratulations! Your shop has been published and is now live." });
      }
      await fetchShopData();
    } catch (error: any) {
      console.error('Error submitting:', error);
      toast({ title: "Submission Failed", description: error.message || "Failed to submit your information.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleAddProduct = async (product: any) => {
    const updatedProducts = [...products, { ...product, id: Date.now() }];
    setProducts(updatedProducts);
    setShowAddProduct(false);
    if (shopData) {
      try {
        await supabase.from('submissions').update({ products: updatedProducts, updated_at: new Date().toISOString() }).eq('id', shopData.id);
        toast({ title: "Product Added", description: "Your product has been added successfully." });
      } catch (error) { console.error('Error updating products:', error); }
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);
    if (shopData) {
      try {
        await supabase.from('submissions').update({ products: updatedProducts, updated_at: new Date().toISOString() }).eq('id', shopData.id);
        toast({ title: "Product Deleted", description: "Your product has been deleted successfully." });
      } catch (error) { console.error('Error updating products:', error); }
    }
  };

  const handleDuplicateProduct = async (product: any) => {
    const updatedProducts = [{ ...product, id: Date.now() }, ...products];
    setProducts(updatedProducts);
    if (shopData) {
      try {
        await supabase.from('submissions').update({ products: updatedProducts, updated_at: new Date().toISOString() }).eq('id', shopData.id);
        toast({ title: "Product Duplicated", description: "Your product has been duplicated successfully." });
      } catch (error) { console.error('Error updating products:', error); }
    }
  };

  const handleEditProduct = async (product: any) => {
    const updatedProducts = products.map(p => p.id === product.id ? product : p);
    setProducts(updatedProducts);
    if (shopData) {
      try {
        await supabase.from('submissions').update({ products: updatedProducts, updated_at: new Date().toISOString() }).eq('id', shopData.id);
        toast({ title: "Product Updated", description: "Your product has been updated successfully." });
      } catch (error) { console.error('Error updating products:', error); }
    }
  };

  const handleDeleteAllProducts = async () => {
    if (!confirm('Are you sure you want to delete all products? This action cannot be undone.')) return;
    setProducts([]);
    if (shopData) {
      try {
        await supabase.from('submissions').update({ products: [], updated_at: new Date().toISOString() }).eq('id', shopData.id);
        toast({ title: "All Products Deleted", description: "All your products have been deleted successfully." });
      } catch (error) { console.error('Error updating products:', error); }
    }
  };

  const handleEmailUpdate = async () => {
    if (!accountFormData.newEmail) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: accountFormData.newEmail });
      if (error) throw error;
      toast({ title: "Email Update", description: "Check your new email for a confirmation link." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      toast({ title: "Password Reset", description: "Check your email for a password reset link." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  // Filter menu items based on shop data
  const availableItems = menuItems.filter(item => !item.requiresShop || !!shopData);
  const currentTitle = availableItems.find((item) => item.section === currentSection)?.title || "Setup";

  const isActive = (section: string) => currentSection === section;

  const navContent = (mobile = false) => (
    <nav className={`flex flex-col gap-1`}>
      {availableItems.map((item) => (
        <NavLink
          key={item.section}
          to={`/test?section=${item.section}`}
          onClick={() => setDrawerOpen(false)}
          className={`flex items-center transition-colors ${
            mobile
              ? `px-5 py-3.5 rounded-xl text-base ${
                  isActive(item.section)
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground/50"
                }`
              : `gap-3 px-4 py-3 rounded-lg text-sm ${
                  isActive(item.section)
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`
          }`}
        >
          {!mobile && <item.icon className="h-4 w-4 shrink-0" />}
          <span>{item.title}</span>
        </NavLink>
      ))}
    </nav>
  );

  // Render section content
  const renderContent = () => {
    switch (currentSection) {
      case 'overview': return shopData ? renderOverview() : renderSetup();
      case 'setup': return renderSetup();
      case 'products': return renderProducts();
      case 'orders': return renderOrders();
      case 'account': return renderAccount();
      default: return shopData ? renderOverview() : renderSetup();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h2 className="hidden sm:block text-2xl font-bold">Stats</h2>
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
                {analytics.lastOrderTime ? formatDistanceToNow(analytics.lastOrderTime, { addSuffix: true }) : 'No data yet'}
              </p>
            </div>
            <div className="space-y-1 md:pl-6">
              <p className="text-sm font-medium">Revenue</p>
              <p className="text-2xl font-bold">${analytics.revenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">--% YoY</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <span className="inline-block w-3 h-3 rounded-full border border-muted-foreground"></span>
                {analytics.lastRevenueTime ? formatDistanceToNow(analytics.lastRevenueTime, { addSuffix: true }) : 'No data yet'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-xl font-bold mb-4">Recent Orders</h3>
        {analytics.recentOrders.length > 0 ? (
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <div className="flex gap-4 w-max">
              {analytics.recentOrders.map((order: any) => {
                const firstItem = order.order_items?.[0];
                const shipByDate = addDays(new Date(order.created_at), 2);
                const hoursRemaining = differenceInHours(shipByDate, new Date());
                const isOverdue = isPast(shipByDate);
                const isShipped = order.status === 'shipped' || order.status === 'delivered';
                return (
                  <Card key={order.id} className="overflow-hidden w-64 flex-shrink-0">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted overflow-hidden">
                        {firstItem?.product_image ? (
                          <img src={firstItem.product_image} alt={firstItem.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <h4 className="text-base font-normal">{firstItem?.product_name || `Order #${order.id.slice(-8)}`}</h4>
                        <p className="text-base text-muted-foreground">${(order.total_amount / 100).toFixed(2)}</p>
                        <div className={`text-xs px-2 py-1 rounded-md w-fit ${
                          isShipped ? 'bg-green-500/10 text-green-600 dark:text-green-500'
                            : isOverdue ? 'bg-destructive/10 text-destructive'
                            : hoursRemaining < 24 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {isShipped ? 'Shipped' : isOverdue ? 'Ship ASAP' : hoursRemaining < 24 ? `Ship in ${hoursRemaining}h` : `Ship by ${formatDistanceToNow(shipByDate, { addSuffix: true })}`}
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

  const renderSetup = () => (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="hidden sm:block text-2xl font-bold mb-2">Shop Details</h2>
        </div>
        {shopData && !isEditMode && (
          <Button variant="outline" onClick={() => { setOriginalFormData({ ...formData }); setIsEditMode(true); }}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
        )}
        {shopData && isEditMode && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFormData(originalFormData); setIsEditMode(false); }} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={async () => { await handleSubmit(); setIsEditMode(false); }} disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" /> {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label>Which farmers markets do you sell at? (Up to 3) *</Label>
            <FarmersMarketSearch selectedMarkets={selectedFarmersMarkets} onMarketsChange={setSelectedFarmersMarkets} isEditing={!shopData || isEditMode} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store_name">Store Name *</Label>
            <Input id="store_name" value={formData.store_name} onChange={(e) => { const v = e.target.value.slice(0, 20); setFormData(prev => ({ ...prev, store_name: v })); }} placeholder="Enter your store name" disabled={!!shopData && !isEditMode} maxLength={20} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Category *</Label>
            <Select value={formData.primary_specialty} onValueChange={(value) => setFormData(prev => ({ ...prev, primary_specialty: value }))} disabled={!!shopData && !isEditMode}>
              <SelectTrigger><SelectValue placeholder="Select a specialty" /></SelectTrigger>
              <SelectContent>
                {SPECIALTY_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Tell us about your shop..." rows={4} disabled={!!shopData && !isEditMode} />
          </div>
          <div className="pt-6 border-t flex gap-4">
            {!shopData && (
              <Button onClick={() => navigate(`/test?section=products`)} className="flex-1">
                Continue to Products <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-center sm:justify-between">
        <h2 className="hidden sm:block text-2xl font-bold mb-2">Product Listings</h2>
        <div className="flex items-center gap-2">
          {products.length > 0 && (
            <Button variant="destructive" onClick={handleDeleteAllProducts} size="sm">
              <Trash2 className="h-4 w-4 mr-2" /> Delete All
            </Button>
          )}
          <Button onClick={() => setShowAddProduct(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>
      <ProductGrid products={products} onDeleteProduct={handleDeleteProduct} onDuplicateProduct={handleDuplicateProduct} onEditProduct={handleEditProduct} vendorId={shopData?.id || 'temp'} vendorName={formData.store_name || 'Your Shop'} />
      {!shopData && (
        <div className="pt-6 border-t mt-6">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Ready to publish your market? You can always add more products later.</p>
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="w-full max-w-md">
              {isSubmitting ? 'Publishing...' : 'Publish Your Market'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-6">
      <VendorOrders
        vendorId={shopData?.id}
        vendorName={shopData?.store_name}
        onOpenChat={(email, items) => { setChatBuyerEmail(email); setChatOrderItems(items); setChatOpen(true); }}
      />
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="hidden sm:block text-2xl font-bold mb-2">Shop Settings And Preferences</h2>
      </div>

      <Card className="w-full">
        <CardHeader><CardTitle>Store Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Vacation Mode</h3>
              <p className="text-sm text-muted-foreground">Temporarily hide your store from customers</p>
            </div>
            <Switch
              checked={shopData?.vacation_mode || false}
              onCheckedChange={async (checked) => {
                if (!user || !shopData) return;
                try {
                  const { error } = await supabase.from('submissions').update({ vacation_mode: checked, updated_at: new Date().toISOString() }).eq('id', shopData.id);
                  if (error) throw error;
                  setShopData(prev => prev ? { ...prev, vacation_mode: checked } : null);
                  toast({ title: checked ? "Vacation Mode Enabled" : "Vacation Mode Disabled", description: checked ? "Your store is now hidden from customers" : "Your store is now visible to customers" });
                } catch (error) {
                  console.error('Error updating vacation mode:', error);
                  toast({ title: "Update Failed", description: "Failed to update vacation mode", variant: "destructive" });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <AccountSection
        formData={accountFormData}
        setFormData={setAccountFormData}
        isSaving={isSaving}
        onEmailUpdate={handleEmailUpdate}
        onPasswordReset={handlePasswordReset}
      />

      <Card className="border-destructive w-full">
        <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-destructive rounded-lg">
            <div>
              <h3 className="font-medium">Delete Store</h3>
              <p className="text-sm text-muted-foreground">Permanently delete your store and all associated data</p>
            </div>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>Delete Store</Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete your store and remove all your products, orders, and store information.</AlertDialogDescription>
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
                  const { data: conversations } = await supabase.from('conversations').select('id').eq('vendor_id', shopData.id);
                  if (conversations && conversations.length > 0) {
                    const ids = conversations.map(c => c.id);
                    await supabase.from('messages').delete().in('conversation_id', ids);
                    await supabase.from('conversations').delete().in('id', ids);
                  }
                  await supabase.from('reviews').delete().eq('vendor_id', shopData.id);
                  await supabase.from('likes').delete().eq('item_id', shopData.id);
                  const { data: orders } = await supabase.from('orders').select('id').eq('vendor_id', shopData.id);
                  if (orders && orders.length > 0) {
                    const orderIds = orders.map(o => o.id);
                    await supabase.from('order_items').delete().in('order_id', orderIds);
                    await supabase.from('commissions').delete().eq('vendor_id', shopData.id);
                    await supabase.from('orders').delete().in('id', orderIds);
                  }
                  const { error } = await supabase.from('submissions').delete().eq('id', shopData.id).eq('user_id', user.id);
                  if (error) throw error;
                  setShopData(null); setProducts([]); setSelectedFarmersMarkets([]);
                  setFormData({ store_name: '', primary_specialty: '', description: '' });
                  toast({ title: "Store Deleted", description: "Your store has been permanently deleted" });
                  setShowDeleteDialog(false);
                  navigate('/test?section=setup');
                } catch (error) {
                  toast({ title: "Delete Failed", description: error instanceof Error ? error.message : "Failed to delete your store", variant: "destructive" });
                } finally { setIsDeleting(false); }
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete Store'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (loading || loadingShop) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background flex">
        {/* Desktop/iPad sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border bg-background sticky top-[57px] h-[calc(100vh-57px)] p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-4">Menu</p>
          {navContent()}
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile sticky header */}
          <div className="md:hidden bg-background border-b border-border px-4 py-2.5 flex items-center gap-3">
            <button type="button" onClick={() => setDrawerOpen(true)} className="p-1.5 rounded-md hover:bg-muted" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-semibold text-sm">{currentTitle}</span>
          </div>

          {/* Page content */}
          <main className="flex-1 p-4 md:p-8">
            {renderContent()}
          </main>
        </div>

        {/* Mobile drawer overlay */}
        {drawerOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <button type="button" aria-label="Close menu overlay" className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
            <div className="absolute top-0 left-0 h-full w-[75%] max-w-[300px] bg-background shadow-xl flex flex-col">
              <div className="flex items-center justify-end px-5 pt-6 pb-2">
                <button type="button" onClick={() => setDrawerOpen(false)} className="p-1" aria-label="Close menu">
                  <X className="h-6 w-6 text-foreground" />
                </button>
              </div>
              <div className="px-3 pt-4">
                {navContent(true)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showAddProduct && (
        <AddProductForm open={showAddProduct} onClose={() => setShowAddProduct(false)} onProductAdded={handleAddProduct} />
      )}

      {/* Floating Chat */}
      {chatOpen && chatBuyerEmail && shopData && (
        <FloatingChat
          isOpen={chatOpen}
          onClose={() => { setChatOpen(false); setChatBuyerEmail(null); setChatOrderItems([]); }}
          vendorId={shopData.id}
          vendorName={chatBuyerEmail}
          orderItems={chatOrderItems}
        />
      )}

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to publish your shop</DialogTitle>
            <DialogDescription>Create an account or sign in to publish your shop and start selling.</DialogDescription>
          </DialogHeader>
          <AuthForm onSuccess={() => setShowAuthModal(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
