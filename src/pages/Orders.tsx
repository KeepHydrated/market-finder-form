import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, Store, DollarSign } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";
import { useToast } from "@/hooks/use-toast";
import { ProductDetailModal } from "@/components/ProductDetailModal";

interface OrderItem {
  id: string;
  product_name: string;
  product_description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image: string;
}

interface Order {
  id: string;
  total_amount: number;
  vendor_name: string;
  vendor_id: string;
  email: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedVendorName, setSelectedVendorName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          vendor_name,
          vendor_id,
          email,
          status,
          created_at,
          order_items (
            id,
            product_name,
            product_description,
            quantity,
            unit_price,
            total_price,
            product_image
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500 hover:bg-green-600';
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'cancelled':
        return 'bg-red-500 hover:bg-red-600';
      case 'processing':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const handleVendorClick = async (vendorId: string, vendorName: string) => {
    try {
      // Fetch the vendor data from submissions
      const { data: vendor, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', vendorId)
        .eq('status', 'accepted')
        .single();

      if (error) throw error;

      if (!vendor) {
        toast({
          title: "Store not found",
          description: "This store is no longer available.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to the vendor page with the vendor data
      navigate('/market', {
        state: {
          type: 'vendor',
          selectedVendor: vendor,
          allVendors: [vendor],
        }
      });
    } catch (error) {
      console.error('Error fetching vendor:', error);
      toast({
        title: "Error",
        description: "Failed to load store information.",
        variant: "destructive",
      });
    }
  };

  const handleProductClick = (item: OrderItem, vendorId: string, vendorName: string) => {
    const product = {
      id: parseInt(item.id),
      name: item.product_name,
      description: item.product_description || '',
      price: item.unit_price / 100, // Convert from cents to dollars
      images: item.product_image ? [item.product_image] : [],
    };
    
    setSelectedProduct(product);
    setSelectedVendorId(vendorId);
    setSelectedVendorName(vendorName);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6">Sign In to View Orders</h1>
          <AuthForm />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Orders</h1>
        <p className="text-muted-foreground">Track and manage your farmer's market orders</p>
      </div>

      {orders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">
              Start shopping at your local farmer's market to see orders here.
            </p>
            <a
              href="/homepage"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Start Shopping
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 max-w-5xl">
          {orders.map((order) => (
            <div key={order.id} className="grid md:grid-cols-[1fr,280px] gap-6">
              <Card className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-base">
                    <span className="text-muted-foreground">Purchased from</span>
                    <Store className="h-4 w-4" />
                    <button
                      onClick={() => handleVendorClick(order.vendor_id, order.vendor_name)}
                      className="font-semibold hover:underline focus:outline-none focus:underline"
                    >
                      {order.vendor_name}
                    </button>
                    <span className="text-muted-foreground">on {formatDate(order.created_at)}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  
                  <div className="space-y-3">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start py-2">
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            onClick={() => handleProductClick(item, order.vendor_id, order.vendor_name)}
                            className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          >
                            {item.product_image ? (
                              <img 
                                src={item.product_image} 
                                alt={item.product_name}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  // Show Package icon as fallback if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-green-600"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>';
                                }}
                              />
                            ) : (
                              <Package className="h-6 w-6 text-green-600" />
                            )}
                          </button>
                          <div className="flex-1">
                            <button
                              onClick={() => handleProductClick(item, order.vendor_id, order.vendor_name)}
                              className="font-medium text-left hover:underline focus:outline-none focus:underline"
                            >
                              {item.quantity > 1 && (
                                <span className="text-muted-foreground mr-2">(x {item.quantity})</span>
                              )}
                              {item.product_name}
                            </button>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium">{formatPrice(item.total_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-lg font-serif mb-1">Arriving Friday, October 3rd</h3>
                  <p className="text-xs mb-0.5">Estimated arrival from USPS</p>
                  <p className="text-xs">
                    From <span className="font-medium">GLENDALE, AZ</span> To{" "}
                    <span className="font-medium underline">San Antonio</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button size="sm" className="w-full rounded-full">
                    Track package
                  </Button>
                  <Button variant="outline" size="sm" className="w-full rounded-full">
                    Help with order
                  </Button>
                  <Button variant="outline" size="sm" className="w-full rounded-full">
                    View receipt
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          products={[selectedProduct]}
          open={!!selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            setSelectedVendorId(null);
            setSelectedVendorName(null);
          }}
          vendorId={selectedVendorId || undefined}
          vendorName={selectedVendorName || undefined}
          hideVendorName={false}
        />
      )}
    </div>
  );
};

export default Orders;