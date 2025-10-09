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
import { ShoppingCart, MapPin, Star, HelpCircle, CreditCard, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { CustomCheckout } from '@/components/shopping/CustomCheckout';

interface PaymentMethod {
  id: string;
  user_id: string;
  payment_type: string;
  card_brand?: string;
  last_4_digits?: string;
  exp_month?: string;
  exp_year?: string;
  bank_name?: string;
  account_holder_name?: string;
  account_number_last_4?: string;
  paypal_email?: string;
  paypal_account_name?: string;
  is_default: boolean;
}

interface Address {
  id: string;
  user_id: string;
  type: 'billing' | 'shipping';
  is_default: boolean;
  full_name: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string | null;
}

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
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [loading, setLoading] = useState(false);
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

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

  const firstVendor = Object.values(groupedItems)[0];

  // Fetch saved addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) {
        setLoadingAddresses(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'shipping')
          .order('is_default', { ascending: false });

        if (error) throw error;

        const addressList = (data as unknown as Address[]) || [];
        setAddresses(addressList);

        // Auto-select default address or first address
        if (addressList.length > 0) {
          const defaultAddress = addressList.find(addr => addr.is_default);
          setSelectedAddress(defaultAddress?.id || addressList[0].id);
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [user]);

  // Fetch saved payment methods from database
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!user) {
        setLoadingPaymentMethods(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });
        
        if (error) throw error;
        
        const methods = (data as unknown as PaymentMethod[]) || [];
        setPaymentMethods(methods);
        
        // Auto-select default or first payment method if available
        if (methods.length > 0) {
          const defaultMethod = methods.find(m => m.is_default);
          setSelectedPaymentMethod(defaultMethod?.id || methods[0].id);
        } else {
          setSelectedPaymentMethod('new');
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        setSelectedPaymentMethod('new');
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    fetchPaymentMethods();
  }, [user]);

  // Fetch vendor data for ratings and profile - MUST be before any conditional returns
  useEffect(() => {
    const fetchVendorData = async () => {
      if (!firstVendor || items.length === 0) return;
      
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
  }, [firstVendor?.vendor_id, items.length]);

  const handleProductClick = (item: any) => {
    // Extract product ID from cart item ID
    const lastHyphenIndex = item.id.lastIndexOf('-');
    const productId = parseInt(item.id.substring(lastHyphenIndex + 1));
    
    const product = {
      id: productId,
      name: item.product_name,
      description: item.product_description || '',
      price: item.unit_price / 100, // Convert from cents to dollars
      images: item.product_image ? [item.product_image] : []
    };
    
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    clearCart();
    navigate('/order-success');
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
                {loadingAddresses ? (
                  <div className="py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">No saved addresses</p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/account?tab=addresses')}
                    >
                      Add new address
                    </Button>
                  </div>
                ) : (
                  <>
                    <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                      {(showAllAddresses ? addresses : addresses.slice(0, 1)).map((address) => (
                        <div key={address.id} className="flex items-start space-x-3 py-2">
                          <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                          <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">
                                {address.full_name}, {address.address_line_1}
                                {address.address_line_2 && `, ${address.address_line_2}`}, {address.city}, {address.postal_code}, {address.country}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    {addresses.length > 1 && !showAllAddresses && (
                      <Button 
                        variant="link" 
                        className="px-0 text-primary"
                        onClick={() => setShowAllAddresses(true)}
                      >
                        Show more
                      </Button>
                    )}
                    
                    {showAllAddresses && addresses.length > 1 && (
                      <Button 
                        variant="link" 
                        className="px-0 text-primary"
                        onClick={() => setShowAllAddresses(false)}
                      >
                        Show less
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/account?tab=addresses')}
                    >
                      Add new address
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold">Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingPaymentMethods ? (
                  <div className="py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">No saved payment methods</p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/account?tab=payments')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add new card
                    </Button>
                  </div>
                ) : (
                  <>
                    <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      {paymentMethods.map((method) => (
                        <div key={method.id} className="flex items-center space-x-3 py-3 px-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <Label htmlFor={method.id} className="flex items-center gap-3 cursor-pointer flex-1">
                            <CreditCard className="w-5 h-5 text-muted-foreground" />
                            <div>
                              {method.payment_type === 'credit-debit' && (
                                <>
                                  <p className="font-medium capitalize">
                                    {method.card_brand} •••• {method.last_4_digits}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Expires {method.exp_month}/{method.exp_year}
                                  </p>
                                </>
                              )}
                              {method.payment_type === 'bank' && (
                                <>
                                  <p className="font-medium">{method.bank_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {method.account_holder_name} •••• {method.account_number_last_4}
                                  </p>
                                </>
                              )}
                              {method.payment_type === 'paypal' && (
                                <>
                                  <p className="font-medium">PayPal</p>
                                  <p className="text-xs text-muted-foreground">
                                    {method.paypal_email}
                                  </p>
                                </>
                              )}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/account?tab=payments')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add new card
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Vendor Info */}
                <div className="flex items-center gap-3 pb-4 border-b">
                  <Link to={`/market?id=${firstVendor.vendor_id}`}>
                    <Avatar className="w-12 h-12 cursor-pointer">
                      <AvatarImage src={storeLogo || undefined} alt={vendorData?.store_name || firstVendor.vendor_name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {storeInitial}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <Link to={`/market?id=${firstVendor.vendor_id}`}>
                      <h3 className="font-bold text-lg cursor-pointer">
                        {vendorData?.store_name || firstVendor.vendor_name}
                      </h3>
                    </Link>
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
                </div>

                {/* Order Items */}
                <div className="space-y-4">
                  {firstVendor.items.map((item, index) => {
                    return (
                      <div key={index} className="flex gap-4">
                        {item.product_image && (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            onClick={() => handleProductClick(item)}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0 cursor-pointer"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1 line-clamp-2">
                            <span 
                              onClick={() => handleProductClick(item)}
                              className="cursor-pointer"
                            >
                              {item.product_name}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-muted-foreground"> (Qty: {item.quantity})</span>
                            )}
                          </h4>
                        </div>
                        <div className="text-right font-semibold">
                          {item.quantity > 1 ? (
                            <div className="text-sm">
                              <span className="text-muted-foreground font-normal">
                                {formatPrice(item.unit_price)} × {item.quantity} =
                              </span>
                              <span className="ml-1">{formatPrice(item.unit_price * item.quantity)}</span>
                            </div>
                          ) : (
                            formatPrice(item.unit_price * item.quantity)
                          )}
                        </div>
                      </div>
                    );
                  })}
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

                {/* Checkout Button */}
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setShowPaymentForm(true)}
                    disabled={!selectedAddress || !selectedPaymentMethod || selectedPaymentMethod === 'new'}
                  >
                    Proceed to Payment
                  </Button>
                  {(!selectedAddress || !selectedPaymentMethod || selectedPaymentMethod === 'new') && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Please select a shipping address and payment method
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <CustomCheckout
              items={items}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setShowPaymentForm(false)}
              selectedPaymentMethodId={selectedPaymentMethod}
              showCancelButton={true}
            />
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && vendorData && (
        <ProductDetailModal
          product={selectedProduct}
          products={vendorData.products || []}
          open={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setSelectedProduct(null);
          }}
          vendorId={firstVendor.vendor_id}
          vendorName={vendorData.store_name || firstVendor.vendor_name}
          hideVendorName={true}
        />
      )}
    </div>
  );
}