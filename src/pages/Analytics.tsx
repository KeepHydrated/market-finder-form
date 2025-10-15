import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Users, Store, MapPin, Package } from 'lucide-react';

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const AUTHORIZED_EMAIL = 'nadiachibri@gmail.com';
  const [stats, setStats] = useState({
    users: 0,
    vendors: 0,
    markets: 0,
    products: 0
  });
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
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

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : stats.users.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendors</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : stats.vendors.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Active vendors</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Markets</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {loading ? '...' : stats.markets.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Listed markets</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
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
    </div>
  );
};

export default Analytics;
