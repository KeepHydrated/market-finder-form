import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Commission {
  id: string;
  order_id: string;
  commission_amount: number;
  order_total: number;
  vendor_name: string;
  commission_rate: number;
  created_at: string;
}

export default function Commissions() {
  const { user, loading: authLoading } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  const AUTHORIZED_EMAIL = 'nadiachibri@gmail.com';

  useEffect(() => {
    if (!authLoading && user) {
      fetchCommissions();
    }
  }, [user, authLoading]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCommissions(data || []);
      const total = data?.reduce((sum, commission) => sum + commission.commission_amount, 0) || 0;
      setTotalEarnings(total);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast.error('Failed to load commission data');
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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Commission Dashboard</h1>
          <p className="text-muted-foreground">Track your 3% commission earnings from all marketplace sales</p>
        </div>
        <Button 
          onClick={fetchCommissions} 
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalEarnings)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commissions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3%</div>
          </CardContent>
        </Card>
      </div>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading commissions...</span>
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No commission data found yet.
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{commission.vendor_name}</h3>
                      <Badge variant="secondary">
                        {(commission.commission_rate * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Order Total: {formatCurrency(commission.order_total)} • {formatDate(commission.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(commission.commission_amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Commission
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}