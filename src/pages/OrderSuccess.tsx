import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Order {
  id: string;
  email: string;
  total_amount: number;
  vendor_name: string;
  created_at: string;
  order_items: {
    product_name: string;
    product_description?: string;
    product_image?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!sessionId && !orderId) {
        setLoading(false);
        return;
      }

      try {
        let orderData;

        if (sessionId) {
          // Verify payment and update order status for Stripe payments
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
            body: { session_id: sessionId }
          });

          if (verifyError) throw verifyError;
          
          console.log('Payment verified:', verifyData);

          // Fetch the updated order details
          const { data, error: orderError } = await supabase
            .from('orders')
            .select(`
              *,
              order_items (
                product_name,
                product_description,
                product_image,
                quantity,
                unit_price,
                total_price
              )
            `)
            .eq('stripe_checkout_session_id', sessionId)
            .single();

          if (orderError) {
            console.error('Error fetching order:', orderError);
          } else {
            orderData = data;
          }
        } else if (orderId) {
          // Fetch order details for manual payments
          const { data, error: orderError } = await supabase
            .from('orders')
            .select(`
              *,
              order_items (
                product_name,
                product_description,
                product_image,
                quantity,
                unit_price,
                total_price
              )
            `)
            .eq('id', orderId)
            .single();

          if (orderError) {
            console.error('Error fetching order:', orderError);
          } else {
            orderData = data;
          }
        }

        if (orderData) {
          setOrder(orderData);
        }
      } catch (error) {
        console.error('Error processing order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [sessionId, orderId]);

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Processing your order...</p>
        </div>
      </div>
    );
  }

  if (!sessionId && !orderId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-muted-foreground mb-4">Invalid order session</p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="text-center mb-8 no-print">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-green-600 mb-2">Order Successful!</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. Your order has been confirmed.
          </p>
        </div>

        {order && (
          <div className="bg-card border rounded-lg p-8 mb-8">
            {/* Header with vendor name and date */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b">
              <h2 className="text-2xl font-bold">{order.vendor_name}</h2>
              <p className="text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>

            {/* Items section */}
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4">Items</h3>
              <div className="space-y-6">
                {order.order_items.map((item, index) => (
                  <div key={index} className="flex gap-4 pb-6 border-b last:border-b-0">
                    {/* Product image */}
                    <div className="w-32 h-32 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    
                    {/* Product details */}
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold mb-1">{item.product_name}</h4>
                      <p className="text-2xl font-bold text-green-600 mb-2">
                        {formatPrice(item.unit_price)}
                      </p>
                      {item.product_description && (
                        <p className="text-muted-foreground mb-2">{item.product_description}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × {formatPrice(item.unit_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-6 border-t">
              <span className="text-2xl font-bold">Total</span>
              <span className="text-2xl font-bold">{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4 no-print">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
          <Button asChild>
            <Link to="/homepage">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>
      </div>

      <style>{`
        @page {
          margin: 0.5cm;
          size: letter;
        }
        @media print {
          html, body {
            height: auto !important;
            overflow: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          /* Hide all headers, navigation, and other page elements */
          header,
          nav,
          [role="banner"],
          [role="navigation"] {
            display: none !important;
          }
          /* Prevent page breaks */
          * {
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .min-h-screen {
            min-height: auto !important;
            height: auto !important;
          }
          /* Reduce font sizes for print */
          h2 {
            font-size: 1.25rem !important;
          }
          h3 {
            font-size: 1.1rem !important;
          }
          h4 {
            font-size: 1rem !important;
          }
          /* Reduce spacing */
          .bg-card {
            padding: 1rem !important;
          }
          /* Make images smaller */
          img {
            max-width: 80px !important;
            max-height: 80px !important;
          }
          .w-32 {
            width: 80px !important;
            height: 80px !important;
          }
          /* Reduce spacing between items */
          .space-y-6 > * + * {
            margin-top: 0.75rem !important;
          }
          .pb-6 {
            padding-bottom: 0.5rem !important;
          }
          .mb-6 {
            margin-bottom: 0.75rem !important;
          }
          .mb-4 {
            margin-bottom: 0.5rem !important;
          }
          .pt-6 {
            padding-top: 0.75rem !important;
          }
          .text-2xl {
            font-size: 1.25rem !important;
          }
          .pt-8 {
            padding-top: 0.5rem !important;
          }
          .mb-8 {
            margin-bottom: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}