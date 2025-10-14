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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ShoppingCart, MapPin, Star, HelpCircle, CreditCard, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { ProductDetailModal } from '@/components/ProductDetailModal';

interface PaymentMethod {
  id: string;
  user_id: string;
  payment_type: string;
  card_brand?: string;
  card_last_four?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  cardholder_name?: string;
  paypal_email?: string;
  apple_pay_email?: string;
  is_default: boolean;
}

interface Address {
  id: string;
  user_id: string;
  type: 'billing' | 'shipping' | 'both';
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
          .in('type', ['shipping', 'both'])
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
      
      const [submissionData, reviewsData] = await Promise.all([
        supabase
          .from('submissions')
          .select('store_name, google_rating, google_rating_count, products')
          .eq('id', firstVendor.vendor_id)
          .eq('status', 'accepted')
          .single(),
        supabase
          .from('reviews')
          .select('rating')
          .eq('vendor_id', firstVendor.vendor_id)
      ]);

      if (!submissionData.error && submissionData.data) {
        // Calculate average rating from reviews
        const reviews = reviewsData.data || [];
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
          : null;

        setVendorData({
          ...submissionData.data,
          google_rating: avgRating,
          google_rating_count: reviews.length
        });
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

  // Convert cart items to product array for modal navigation
  const cartProducts = firstVendor?.items.map((item, index) => {
    const lastHyphenIndex = item.id.lastIndexOf('-');
    const productId = parseInt(item.id.substring(lastHyphenIndex + 1));
    
    return {
      id: productId,
      name: item.product_name,
      description: item.product_description || '',
      price: item.unit_price / 100,
      images: item.product_image ? [item.product_image] : []
    };
  }) || [];

  const handleCompletePayment = async () => {
    if (!user || !selectedAddress || !selectedPaymentMethod) return;
    
    // Prevent empty orders
    if (items.length === 0) {
      sonnerToast.error('Your cart is empty. Please add items before checking out.');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Get address details
      const address = addresses.find(a => a.id === selectedAddress);
      if (!address) throw new Error('Address not found');

      // Create order in database
      const orderData = {
        user_id: user.id,
        email: user.email || '',
        vendor_id: firstVendor.vendor_id,
        vendor_name: firstVendor.vendor_name,
        total_amount: total,
        status: 'paid',
        ship_to_city: address.city,
        ship_to_state: address.state,
        stripe_checkout_session_id: `manual_${Date.now()}`,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_name: item.product_name,
        product_description: item.product_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        product_image: item.product_image,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error inserting order items:', itemsError);
        throw itemsError;
      }

      sonnerToast.success('Order placed successfully!');
      clearCart();
      navigate(`/order-success?order_id=${order.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      sonnerToast.error('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
      setShowConfirmDialog(false);
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
            <Button onClick={() => navigate('/')} size="lg">
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
                                {address.full_name && `${address.full_name}, `}{address.address_line_1}
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
                    {(() => {
                      const defaultMethod = paymentMethods.find(m => m.is_default);
                      if (!defaultMethod) return null;
                      
                      return (
                        <div className="flex items-center gap-3 py-3 px-4 border rounded-lg bg-muted/50">
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1">
                            {defaultMethod.payment_type === 'card' && (
                              <>
                                <p className="font-medium capitalize">
                                  {defaultMethod.card_brand} •••• {defaultMethod.card_last_four}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Expires {defaultMethod.card_exp_month}/{defaultMethod.card_exp_year}
                                </p>
                              </>
                            )}
                            {defaultMethod.payment_type === 'paypal' && (
                              <>
                                <p className="font-medium">PayPal</p>
                                <p className="text-xs text-muted-foreground">
                                  {defaultMethod.paypal_email}
                                </p>
                              </>
                            )}
                            {defaultMethod.payment_type === 'apple_pay' && (
                              <>
                                <p className="font-medium">Apple Pay</p>
                                <p className="text-xs text-muted-foreground">
                                  {defaultMethod.apple_pay_email}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/account?tab=payments')}
                    >
                      Manage payment methods
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
                <div className="pb-4 border-b">
                  <Link to={`/market?id=${firstVendor.vendor_id}`} className="flex items-center gap-4 flex-wrap">
                    <h3 className="font-bold text-lg">
                      {vendorData?.store_name || firstVendor.vendor_name}
                    </h3>
                    {vendorData?.google_rating ? (
                      <>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-4 h-4 ${
                                star <= Math.round(vendorData.google_rating!) 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="font-semibold text-base">
                          {vendorData.google_rating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          ({vendorData.google_rating_count || 0})
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">No ratings yet</span>
                    )}
                  </Link>
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
                          <div className="font-semibold">
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
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!selectedAddress || !selectedPaymentMethod || selectedPaymentMethod === 'new'}
                  >
                    Purchase
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to complete this payment of {formatPrice(total)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompletePayment} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          products={cartProducts}
          open={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setSelectedProduct(null);
          }}
          vendorId={firstVendor?.vendor_id}
          vendorName={vendorData?.store_name || firstVendor?.vendor_name}
          hideVendorName={true}
          hideAddToCart={true}
        />
      )}
    </div>
  );
}