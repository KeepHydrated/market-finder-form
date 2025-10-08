import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, Mail } from "lucide-react";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { OrderChatDialog } from "@/components/OrderChatDialog";

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
  email: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

interface VendorOrdersProps {
  vendorId?: string;
  vendorName?: string;
}

export const VendorOrders = ({ vendorId, vendorName }: VendorOrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (vendorId) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [vendorId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
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
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
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

  const handleProductClick = (item: OrderItem) => {
    const product = {
      id: Math.random(), // Temporary ID for modal
      name: item.product_name,
      description: item.product_description || '',
      price: item.unit_price / 100, // Convert from cents to dollars
      images: item.product_image ? [item.product_image] : [],
    };
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleMessageBuyer = (order: Order) => {
    setSelectedOrder(order);
    setIsChatOpen(true);
  };

  if (!vendorId) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Set up your shop first</h3>
          <p className="text-muted-foreground">
            Complete your shop setup to start receiving and managing orders.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Shop Orders</h1>
        <p className="text-muted-foreground">Track and manage your farmer's market orders</p>
      </div>

      {orders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground">
              Orders from customers will appear here once they start purchasing your products.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 max-w-5xl">
          {orders.map((order) => (
            <div key={order.id} className="grid md:grid-cols-[1fr,280px] gap-6">
              <Card className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-base">
                    <span className="text-muted-foreground">Order from</span>
                    <Mail className="h-4 w-4" />
                    <span className="font-semibold">{order.email}</span>
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
                            onClick={() => handleProductClick(item)}
                            className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
                          >
                            {item.product_image ? (
                              <img 
                                src={item.product_image} 
                                alt={item.product_name}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-green-600"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>';
                                }}
                              />
                            ) : (
                              <Package className="h-6 w-6 text-green-600" />
                            )}
                          </button>
                          <div className="flex-1">
                            <button
                              onClick={() => handleProductClick(item)}
                              className="text-left w-full cursor-pointer"
                            >
                              <h5 className="font-medium">
                                {item.quantity > 1 && (
                                  <span className="text-muted-foreground mr-2">(x {item.quantity})</span>
                                )}
                                {item.product_name}
                              </h5>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full rounded-full"
                    onClick={() => handleMessageBuyer(order)}
                  >
                    Message buyer
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

      <ProductDetailModal
        product={selectedProduct}
        products={selectedProduct ? [selectedProduct] : []}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hideVendorName={true}
      />

      <OrderChatDialog
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        order={selectedOrder}
        vendorId={vendorId || ''}
        vendorName={vendorName}
      />
    </div>
  );
};