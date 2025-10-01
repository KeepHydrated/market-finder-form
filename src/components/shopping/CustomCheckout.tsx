import React, { useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

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
  selectedPaymentMethodId?: string;
  showCancelButton?: boolean;
}

interface CheckoutFormProps {
  clientSecret: string;
  customerEmail: string;
  onSuccess: () => void;
  onCancel: () => void;
  showCancelButton?: boolean;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  clientSecret,
  customerEmail,
  onSuccess,
  onCancel,
  showCancelButton = true,
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
      <div className={showCancelButton ? "flex gap-3" : ""}>
        {showCancelButton && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!stripe || isLoading}
          className={showCancelButton ? "flex-1" : "w-full"}
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
  selectedPaymentMethodId,
  showCancelButton = true,
}) => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState('');
  const [loading, setLoading] = useState(true);
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

  // Automatically create payment intent on mount
  useEffect(() => {
    if (clientSecret) return; // Prevent duplicate creation
    
    const createPaymentIntent = async () => {
      setLoading(true);
      try {
        const vendorGroup = Object.values(groupedItems)[0];
        const session = await supabase.auth.getSession();
        
        // Get customer email from session or guest input
        const customerEmail = session.data.session?.user?.email || guestEmail;
        
        if (!customerEmail) {
          // Wait for user to be loaded
          setLoading(false);
          return;
        }
        
        console.log('Creating payment intent for:', customerEmail);
        
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            items: vendorGroup.items,
            vendor_id: Object.keys(groupedItems)[0],
            vendor_name: vendorGroup.vendor_name,
            customer_email: customerEmail,
            payment_method_id: selectedPaymentMethodId,
          },
          headers: session.data.session ? {
            Authorization: `Bearer ${session.data.session.access_token}`,
          } : {},
        });

        if (error) {
          console.error('Payment intent error:', error);
          throw error;
        }
        
        console.log('Payment intent response:', data);
        
        if (data?.client_secret) {
          setClientSecret(data.client_secret);
        } else {
          throw new Error('No client secret returned');
        }
      } catch (error) {
        console.error('Error creating payment intent:', error);
        toast.error('Failed to initialize checkout. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [user?.email, guestEmail, clientSecret]);

  const customerEmail = user?.email || guestEmail;

  // Memoize options to prevent unnecessary re-renders
  const options = useMemo(() => ({
    clientSecret: clientSecret || '',
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0F172A',
        borderRadius: '8px',
      },
    },
  }), [clientSecret]);

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Setting up payment...</p>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Preparing checkout...</p>
          <Button onClick={onCancel} variant="outline">Back to Cart</Button>
        </CardContent>
      </Card>
    );
  }

  // If using saved payment method, show simplified UI
  if (selectedPaymentMethodId && selectedPaymentMethodId !== 'new') {
    return (
      <Button 
        className="w-full h-14 text-lg font-semibold bg-foreground text-background hover:bg-foreground/90"
        onClick={async () => {
          setLoading(true);
          try {
            const vendorGroup = Object.values(groupedItems)[0];
            const session = await supabase.auth.getSession();
            
            const { data, error } = await supabase.functions.invoke('create-payment-intent', {
              body: {
                items: vendorGroup.items,
                vendor_id: Object.keys(groupedItems)[0],
                vendor_name: vendorGroup.vendor_name,
                customer_email: customerEmail,
                payment_method_id: selectedPaymentMethodId,
                confirm: true,
              },
              headers: session.data.session ? {
                Authorization: `Bearer ${session.data.session.access_token}`,
              } : {},
            });

            if (error) throw error;
            
            if (data?.success) {
              toast.success('Payment successful!');
              onSuccess();
            } else {
              throw new Error('Payment failed');
            }
          } catch (error) {
            console.error('Payment error:', error);
            toast.error('Payment failed. Please try again.');
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
      </CardHeader>
      <CardContent>
        {clientSecret && (
          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm
              clientSecret={clientSecret}
              customerEmail={customerEmail}
              onSuccess={onSuccess}
              onCancel={showCancelButton ? onCancel : () => {}}
              showCancelButton={showCancelButton}
            />
          </Elements>
        )}
      </CardContent>
    </Card>
  );
};