import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useShoppingCart } from '@/contexts/ShoppingCartContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ShoppingCart, MapPin, Star, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';

interface VendorData {
  store_name: string;
  google_rating: number | null;
  google_rating_count: number | null;
  products: any; // Json type from Supabase
}

export default function Checkout() {
  const { items, clearCart } = useShoppingCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState('default');
  const [selectedPayment, setSelectedPayment] = useState('stripe');
  const [loading, setLoading] = useState(false);
  const [vendorData, setVendorData] = useState<VendorData | null>(null);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const shipping = 649; // $6.49 in cents
  const marketplaceFee = Math.round(subtotal * 0.03); // 3% fee
  const total = subtotal + shipping + marketplaceFee;

  const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

  // Group items by vendor
  const groupedItems = items.reduce((groups, item) => {
    const vendorId = item.vendor_id;
    if (!groups[vendorId]) {
      groups[vendorId] = {
        vendor_name: item.vendor_name,
        vendor_id: item.vendor_id,
        items: [],
      };
    }
    groups[vendorId].items.push(item);
    return groups;
  }, {} as Record<string, { vendor_name: string; vendor_id: string; items: typeof items }>);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const vendorGroup = Object.values(groupedItems)[0];
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          items: vendorGroup.items,
          vendor_id: vendorGroup.vendor_id,
          vendor_name: vendorGroup.vendor_name,
          customer_email: user?.email,
        },
        headers: user ? {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        } : {},
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        sonnerToast.success('Redirecting to checkout...');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      sonnerToast.error('Failed to initialize checkout');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Your Cart is Empty</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Add some items to your cart before checking out.
            </p>
            <Button onClick={() => navigate('/homepage')} size="lg">
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstVendor = Object.values(groupedItems)[0];

  // Fetch vendor data for ratings and profile
  useEffect(() => {
    const fetchVendorData = async () => {
      if (!firstVendor) return;
      
      const { data, error } = await supabase
        .from('submissions')
        .select('store_name, google_rating, google_rating_count, products')
        .eq('id', firstVendor.vendor_id)
        .eq('status', 'accepted')
        .single();

      if (!error && data) {
        setVendorData(data);
      }
    };

    fetchVendorData();
  }, [firstVendor?.vendor_id]);

  // Get store logo from first product image if available
  const getStoreLogo = () => {
    if (vendorData?.products && Array.isArray(vendorData.products)) {
      for (const product of vendorData.products) {
        if (product.images && product.images.length > 0) {
          return product.images[0];
        }
      }
    }
    return null;
  };

  const storeLogo = getStoreLogo();
  const storeInitial = (vendorData?.store_name || firstVendor?.vendor_name || '?')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Shipping & Payment */}
          <div className="space-y-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold">Shipping address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="default" id="default" className="mt-1" />
                    <Label htmlFor="default" className="flex-1 cursor-pointer">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <span className="text-sm">
                          {user?.email || 'Guest'}, 323 Beacon Street, Boston, 02116, United States
                        </span>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
                <Button variant="link" className="px-0 text-primary">
                  Show more
                </Button>
                <Button variant="outline" className="w-full">
                  Add new address
                </Button>
              </CardContent>
            </Card>

            {/* Payment Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold">Payment type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
                  <div className="flex items-center space-x-3 py-2">
                    <RadioGroupItem value="stripe" id="stripe" />
                    <Label htmlFor="stripe" className="flex items-center gap-2 cursor-pointer flex-1">
                      <div className="w-10 h-6 bg-primary/10 rounded flex items-center justify-center text-xs font-semibold">
                        💳
                      </div>
                      <span>Stripe Checkout</span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Checkout Button */}
            <Button 
              className="w-full h-14 text-lg font-semibold bg-foreground text-background hover:bg-foreground/90"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Proceed to Payment'}
            </Button>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Vendor Info */}
                <Link 
                  to={`/market?id=${firstVendor.vendor_id}`}
                  className="flex items-center gap-3 pb-4 border-b hover:opacity-80 transition-opacity"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={storeLogo || undefined} alt={vendorData?.store_name || firstVendor.vendor_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {storeInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{vendorData?.store_name || firstVendor.vendor_name}</h3>
                    <div className="flex items-center gap-1 text-sm">
                      {vendorData?.google_rating ? (
                        <>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-4 h-4 ${
                                star <= Math.round(vendorData.google_rating!) 
                                  ? 'fill-primary text-primary' 
                                  : 'text-muted-foreground'
                              }`} 
                            />
                          ))}
                          <span className="ml-1 text-muted-foreground">
                            ({vendorData.google_rating_count || 0})
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No ratings yet</span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Order Items */}
                <div className="space-y-4">
                  {firstVendor.items.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      {item.product_image && (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 line-clamp-2">
                          {item.product_name}
                        </h4>
                        {item.product_description && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {item.product_description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right font-semibold">
                        {formatPrice(item.unit_price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span className="font-medium">{formatPrice(shipping)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="flex items-center gap-1">
                      Marketplace fee
                      <HelpCircle className="w-3 h-3 text-muted-foreground" />
                    </span>
                    <span className="font-medium">{formatPrice(marketplaceFee)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-lg font-bold">Total to pay</span>
                    <span className="text-xl font-bold">{formatPrice(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}