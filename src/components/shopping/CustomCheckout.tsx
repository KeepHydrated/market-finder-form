import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

interface CartItem {
  id: string;
  product_name: string;
  product_description?: string;
  unit_price: number;
  quantity: number;
  vendor_id: string;
  vendor_name: string;
  product_image?: string;
}

interface CustomCheckoutProps {
  items: CartItem[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface CheckoutFormProps {
  clientSecret: string;
  customerEmail: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  clientSecret,
  customerEmail,
  onSuccess,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-success`,
        receipt_email: customerEmail,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      toast.error(result.error.message || 'Payment failed');
      setIsLoading(false);
    } else {
      toast.success('Payment successful!');
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isLoading}
          className="flex-1"
        >
          {isLoading ? 'Processing...' : 'Pay Now'}
        </Button>
      </div>
    </form>
  );
};

export const CustomCheckout: React.FC<CustomCheckoutProps> = ({
  items,
  onSuccess,
  onCancel,
}) => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

  // Group items by vendor
  const groupedItems = items.reduce((groups, item) => {
    const vendorId = item.vendor_id;
    if (!groups[vendorId]) {
      groups[vendorId] = {
        vendor_name: item.vendor_name,
        items: [],
      };
    }
    groups[vendorId].items.push(item);
    return groups;
  }, {} as Record<string, { vendor_name: string; items: CartItem[] }>);

  const handleCreatePaymentIntent = async () => {
    setLoading(true);
    try {
      const vendorGroup = Object.values(groupedItems)[0]; // For now, handle one vendor
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          items: vendorGroup.items,
          vendor_id: Object.keys(groupedItems)[0],
          vendor_name: vendorGroup.vendor_name,
          customer_email: user?.email || guestEmail,
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      setClientSecret(data.client_secret);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast.error('Failed to initialize checkout');
    } finally {
      setLoading(false);
    }
  };

  // Auto-initialize payment intent when user is logged in or email is provided
  useEffect(() => {
    if ((user || guestEmail) && !clientSecret && !loading) {
      handleCreatePaymentIntent();
    }
  }, [user, guestEmail, clientSecret, loading]);

  const customerEmail = user?.email || guestEmail;

  const options = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  } : undefined;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Checkout</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary - Left Side */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Order Summary</h3>
            <div className="space-y-4">
              {Object.values(groupedItems).map((group, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {group.vendor_name}
                  </h4>
                  {group.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between text-sm">
                      <span>
                        {item.product_name} × {item.quantity}
                      </span>
                      <span>{formatPrice(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form - Right Side */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Payment Information</h3>
            
            {/* Guest Email Input */}
            {!user && (
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Payment Elements */}
            {clientSecret && options ? (
              <Elements options={options} stripe={stripePromise}>
                <CheckoutForm
                  clientSecret={clientSecret}
                  customerEmail={customerEmail}
                  onSuccess={onSuccess}
                  onCancel={onCancel}
                />
              </Elements>
            ) : (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">Initializing payment...</div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={onCancel} className="flex-1">
                      Back to Cart
                    </Button>
                    <Button
                      onClick={handleCreatePaymentIntent}
                      disabled={!user && !guestEmail}
                      className="flex-1"
                    >
                      Continue to Payment
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};