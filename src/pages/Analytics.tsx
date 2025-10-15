import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Users, Store, MapPin, Package, ChevronDown, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const AUTHORIZED_EMAIL = 'nadiachibri@gmail.com';
  const [stats, setStats] = useState({
    users: 0,
    vendors: 0,
    markets: 0,
    products: 0
  });
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentVendors, setRecentVendors] = useState<any[]>([]);
  const [recentMarkets, setRecentMarkets] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<'users' | 'vendors' | 'markets' | 'products' | 'orders' | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStats();
    }
  }, [user, authLoading]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total vendors (accepted submissions)
      const { count: vendorsCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted');

      // Get total markets
      const { count: marketsCount } = await supabase
        .from('markets')
        .select('*', { count: 'exact', head: true });

      // Get total products (sum of all products in submissions)
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('products')
        .eq('status', 'accepted');

      let totalProducts = 0;
      if (submissionsData) {
        submissionsData.forEach((submission: any) => {
          if (Array.isArray(submission.products)) {
            totalProducts += submission.products.length;
          }
        });
      }

      setStats({
        users: usersCount || 0,
        vendors: vendorsCount || 0,
        markets: marketsCount || 0,
        products: totalProducts
      });

      // Get recent users
      const { data: recentUsersData } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentUsersData) {
        setRecentUsers(recentUsersData);
      }

      // Get recent vendors (accepted submissions)
      const { data: recentVendorsData } = await supabase
        .from('submissions')
        .select('id, user_id, store_name, created_at, updated_at')
        .eq('status', 'accepted')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (recentVendorsData) {
        setRecentVendors(recentVendorsData);
      }

      // Get recent markets
      const { data: recentMarketsData } = await supabase
        .from('markets')
        .select('id, name, address, city, state, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentMarketsData) {
        setRecentMarkets(recentMarketsData);
      }

      // Get recent products (from all accepted submissions)
      const { data: allSubmissions } = await supabase
        .from('submissions')
        .select('id, store_name, products')
        .eq('status', 'accepted');

      const allProducts: any[] = [];
      if (allSubmissions) {
        allSubmissions.forEach((submission: any) => {
          if (Array.isArray(submission.products)) {
            submission.products.forEach((product: any) => {
              allProducts.push({
                ...product,
                vendorId: submission.id,
                storeName: submission.store_name
              });
            });
          }
        });
      }

      // Sort by creation date and take the 10 most recent
      const sortedProducts = allProducts.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      }).slice(0, 10);

      setRecentProducts(sortedProducts);

      // Get order statistics
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, 
          total_amount, 
          status, 
          created_at, 
          vendor_name, 
          email,
          order_items (
            product_name,
            product_image,
            quantity,
            unit_price
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const totalOrders = ordersData?.length || 0;
      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const pendingOrders = ordersData?.filter(o => o.status === 'pending').length || 0;
      const completedOrders = ordersData?.filter(o => o.status === 'completed').length || 0;

      setOrderStats({
        totalOrders,
        totalRevenue: totalRevenue / 100, // Convert from cents
        averageOrderValue: averageOrderValue / 100,
        pendingOrders,
        completedOrders
      });

      setRecentOrders(ordersData?.slice(0, 10) || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Check if user is authorized
  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || user.email !== AUTHORIZED_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Page Views</h1>
        <p className="text-muted-foreground">Track visitor engagement across different time periods</p>
      </div>

      <ScrollArea className="w-full whitespace-nowrap mb-6">
        <div className="flex gap-4 pb-4">
          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">7</div>
              <p className="text-xs text-muted-foreground">vs 21 yesterday</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">57</div>
              <p className="text-xs text-muted-foreground">vs 126 last week</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">355</div>
              <p className="text-xs text-muted-foreground">vs 3042 last month</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">3397</div>
              <p className="text-xs text-muted-foreground">All time page views</p>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Platform Statistics</h2>
      </div>

      <ScrollArea className="w-full whitespace-nowrap mb-6">
        <div className="flex gap-4 pb-4">
          <Card 
            className="min-w-[200px] flex-shrink-0 cursor-pointer hover:border-primary transition-colors"
            onClick={() => setActiveSection(activeSection === 'users' ? null : 'users')}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${activeSection === 'users' ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : stats.users.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card 
            className="min-w-[200px] flex-shrink-0 cursor-pointer hover:border-primary transition-colors"
            onClick={() => setActiveSection(activeSection === 'vendors' ? null : 'vendors')}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendors</CardTitle>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${activeSection === 'vendors' ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : stats.vendors.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Active vendors</p>
            </CardContent>
          </Card>

          <Card 
            className="min-w-[200px] flex-shrink-0 cursor-pointer hover:border-primary transition-colors"
            onClick={() => setActiveSection(activeSection === 'markets' ? null : 'markets')}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Markets</CardTitle>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${activeSection === 'markets' ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : stats.markets.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Listed markets</p>
            </CardContent>
          </Card>

          <Card 
            className="min-w-[200px] flex-shrink-0 cursor-pointer hover:border-primary transition-colors"
            onClick={() => setActiveSection(activeSection === 'products' ? null : 'products')}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${activeSection === 'products' ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : stats.products.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Available products</p>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {activeSection === 'users' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5" />
            <h2 className="text-2xl font-bold">Recently Joined Users</h2>
          </div>
          <p className="text-muted-foreground mb-6">Latest users who signed up to the platform</p>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-6 pb-4">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : recentUsers.length === 0 ? (
                <p className="text-muted-foreground">No users yet</p>
              ) : (
                recentUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex flex-col items-center gap-2 min-w-[100px] cursor-pointer transition-transform hover:scale-105"
                    onClick={() => navigate(`/profile/${user.user_id}`)}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.avatar_url} alt={user.full_name || 'User'} />
                      <AvatarFallback className="text-lg font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="font-medium text-sm truncate max-w-[100px] hover:text-primary transition-colors">
                        {user.full_name || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {activeSection === 'vendors' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-5 w-5" />
            <h2 className="text-2xl font-bold">Recently Joined Vendors</h2>
          </div>
          <p className="text-muted-foreground mb-6">Latest vendors whose stores were accepted</p>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-6 pb-4">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : recentVendors.length === 0 ? (
                <p className="text-muted-foreground">No vendors yet</p>
              ) : (
                recentVendors.map((vendor) => (
                  <div 
                    key={vendor.id} 
                    className="flex flex-col items-center gap-2 min-w-[120px] cursor-pointer transition-transform hover:scale-105"
                    onClick={() => navigate(`/market?vendor=${vendor.id}`)}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-lg font-semibold bg-primary/10">
                        <Store className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="font-medium text-sm truncate max-w-[120px] hover:text-primary transition-colors">
                        {vendor.store_name || 'Store'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(vendor.updated_at), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {activeSection === 'markets' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5" />
            <h2 className="text-2xl font-bold">Recently Joined Markets</h2>
          </div>
          <p className="text-muted-foreground mb-6">Latest farmers markets added to the platform</p>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-6 pb-4">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : recentMarkets.length === 0 ? (
                <p className="text-muted-foreground">No markets yet</p>
              ) : (
                recentMarkets.map((market) => (
                  <div 
                    key={market.id} 
                    className="flex flex-col gap-2 min-w-[180px] cursor-pointer transition-transform hover:scale-105 p-4 border rounded-lg"
                    onClick={() => window.location.href = `/?market=${market.id}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[160px] hover:text-primary transition-colors">
                        {market.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {market.city}, {market.state}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(market.created_at), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {activeSection === 'products' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5" />
            <h2 className="text-2xl font-bold">Recently Added Products</h2>
          </div>
          <p className="text-muted-foreground mb-6">Latest products added by vendors</p>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-6 pb-4">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : recentProducts.length === 0 ? (
                <p className="text-muted-foreground">No products yet</p>
              ) : (
                recentProducts.map((product, index) => (
                  <div 
                    key={`${product.vendorId}-${index}`}
                    className="flex flex-col gap-2 min-w-[160px] cursor-pointer transition-transform hover:scale-105"
                    onClick={() => navigate(`/market?vendor=${product.vendorId}`)}
                  >
                    <div className="relative h-32 w-full rounded-lg overflow-hidden bg-muted">
                      {product.images?.[0] ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[160px] hover:text-primary transition-colors">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {product.storeName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${product.price}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      <div className="mb-6 mt-12">
        <h2 className="text-xl font-semibold mb-4">Order Statistics</h2>
      </div>

      <ScrollArea className="w-full whitespace-nowrap mb-6">
        <div className="flex gap-4 pb-4">
          <Card 
            className="min-w-[200px] flex-shrink-0 cursor-pointer hover:border-primary transition-colors"
            onClick={() => setActiveSection(activeSection === 'orders' ? null : 'orders')}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${activeSection === 'orders' ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : orderStats.totalOrders.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">All time orders</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : `$${orderStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <p className="text-xs text-muted-foreground">Total sales</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : `$${orderStats.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <p className="text-xs text-muted-foreground">Per order</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : orderStats.pendingOrders.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting fulfillment</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : orderStats.completedOrders.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Fulfilled orders</p>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {activeSection === 'orders' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-2xl font-bold">Recent Orders</h2>
          </div>
          <p className="text-muted-foreground mb-6">Latest orders placed on the platform</p>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-6 pb-4">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : recentOrders.length === 0 ? (
                <p className="text-muted-foreground">No orders yet</p>
              ) : (
                recentOrders.map((order) => {
                  const firstItem = order.order_items?.[0];
                  
                  return (
                    <div 
                      key={order.id}
                      className="flex flex-col gap-2 min-w-[200px] cursor-pointer transition-transform hover:scale-105"
                    >
                      <div className="relative h-48 w-full rounded-lg overflow-hidden bg-muted">
                        {firstItem?.product_image ? (
                          <img 
                            src={firstItem.product_image} 
                            alt={firstItem.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-normal text-muted-foreground">
                          ${(order.total_amount / 100).toFixed(2)}
                        </p>
                        <p className="text-base text-foreground">
                          {firstItem?.product_name || order.vendor_name}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default Analytics;
