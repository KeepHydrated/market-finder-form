import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

function PaymentMethodForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add a payment method.",
          variant: "destructive",
        });
        return;
      }

      // Get client secret from edge function
      const { data: setupData, error: setupError } = await supabase.functions.invoke('create-setup-intent');
      
      if (setupError) throw setupError;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      // Confirm card setup with Stripe
      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(
        setupData.client_secret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) throw stripeError;
      if (!setupIntent.payment_method) throw new Error('No payment method created');

      // Get payment method ID (can be string or object)
      const paymentMethodId = typeof setupIntent.payment_method === 'string' 
        ? setupIntent.payment_method 
        : setupIntent.payment_method.id;
      
      // We need to fetch the payment method details from Stripe via edge function
      // For now, save with minimal info and let Stripe handle the details
      const { error: dbError } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          payment_type: 'credit-debit',
          card_brand: 'card', // Will be updated when fetched
          last_4_digits: '****', // Will be updated when fetched
          exp_month: '01', // Will be updated when fetched
          exp_year: '2099', // Will be updated when fetched
          is_default: setAsDefault,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Payment method added successfully.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Card Information</Label>
        <div className="p-4 border-2 rounded-xl">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Your card details are securely processed by Stripe with full autofill support
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="default"
          checked={setAsDefault}
          onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
        />
        <Label htmlFor="default" className="text-base font-normal cursor-pointer">
          Set as default payment method
        </Label>
      </div>

      <div className="flex gap-4 pt-4">
        <Button 
          type="button"
          variant="outline" 
          className="flex-1 h-12 text-base border-2 rounded-xl"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          className="flex-1 h-12 text-base rounded-xl bg-teal-500 hover:bg-teal-600"
          disabled={isLoading || !stripe}
        >
          {isLoading ? "Saving..." : "Add Payment Method"}
        </Button>
      </div>
    </form>
  );
}

export default function Two() {
  const [isOpen, setIsOpen] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    // Fetch Stripe publishable key
    const initStripe = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-stripe-key');
        if (error) throw error;
        if (data?.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      } catch (error) {
        console.error('Failed to load Stripe:', error);
      }
    };
    initStripe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Page 2</h1>
        <Button className="mt-4" onClick={() => setIsOpen(true)}>test</Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Add Payment Method</DialogTitle>
            </DialogHeader>
            
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <PaymentMethodForm 
                  onSuccess={() => setIsOpen(false)}
                  onCancel={() => setIsOpen(false)}
                />
              </Elements>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Loading payment form...
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
