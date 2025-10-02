import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

function PaymentMethodForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [paymentType, setPaymentType] = useState('credit-debit');
  const [bankData, setBankData] = useState({
    bankName: '',
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
  });
  const [paypalData, setPaypalData] = useState({
    email: '',
    accountName: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (paymentType === 'credit-debit') {
        // Handle Stripe card payment with Link
        if (!stripe || !elements) {
          throw new Error('Stripe not loaded');
        }

        // Submit the payment element to confirm setup
        const { error: submitError } = await elements.submit();
        if (submitError) throw submitError;

        // Confirm the setup
        const { error: confirmError } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: window.location.href, // Not used for setup but required
          },
          redirect: 'if_required', // Don't redirect, handle in-page
        });

        if (confirmError) throw confirmError;

        const { error: dbError } = await supabase
          .from('payment_methods')
          .insert({
            user_id: user.id,
            payment_type: 'credit-debit',
            card_brand: 'card',
            last_4_digits: '****',
            exp_month: '01',
            exp_year: '2099',
            is_default: setAsDefault,
          });

        if (dbError) throw dbError;

      } else if (paymentType === 'bank') {
        // Handle bank account
        const { error: dbError } = await supabase
          .from('payment_methods')
          .insert({
            user_id: user.id,
            payment_type: 'bank',
            bank_name: bankData.bankName,
            account_holder_name: bankData.accountHolderName,
            routing_number: bankData.routingNumber,
            account_number_last_4: bankData.accountNumber.slice(-4),
            is_default: setAsDefault,
          });

        if (dbError) throw dbError;

      } else if (paymentType === 'paypal') {
        // Handle PayPal
        const { error: dbError } = await supabase
          .from('payment_methods')
          .insert({
            user_id: user.id,
            payment_type: 'paypal',
            paypal_email: paypalData.email,
            paypal_account_name: paypalData.accountName,
            is_default: setAsDefault,
          });

        if (dbError) throw dbError;
      }

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
        <Label htmlFor="payment-type" className="text-base font-semibold">Payment Type</Label>
        <Select value={paymentType} onValueChange={setPaymentType}>
          <SelectTrigger className="w-full h-12 text-base border-2 rounded-xl">
            <SelectValue placeholder="Select payment type" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="credit-debit" className="text-base py-3">Credit/Debit Card</SelectItem>
            <SelectItem value="bank" className="text-base py-3">Bank Account</SelectItem>
            <SelectItem value="paypal" className="text-base py-3">PayPal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paymentType === 'credit-debit' && (
        <div className="space-y-2">
          <Label className="text-base font-semibold">Card Information</Label>
          <div className="rounded-xl">
            <PaymentElement
              options={{
                layout: {
                  type: 'tabs',
                  defaultCollapsed: false,
                },
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            💳 Save your payment info with Link for instant autofill on your next purchase
          </p>
        </div>
      )}

      {paymentType === 'bank' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="bank-name" className="text-base font-semibold">Bank Name</Label>
            <Input
              id="bank-name"
              placeholder="Enter bank name"
              value={bankData.bankName}
              onChange={(e) => setBankData(prev => ({ ...prev, bankName: e.target.value }))}
              className="h-12 text-base border-2 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-holder" className="text-base font-semibold">Account Holder Name</Label>
            <Input
              id="account-holder"
              placeholder="Enter account holder name"
              value={bankData.accountHolderName}
              onChange={(e) => setBankData(prev => ({ ...prev, accountHolderName: e.target.value }))}
              className="h-12 text-base border-2 rounded-xl"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="routing-number" className="text-base font-semibold">Routing Number</Label>
            <Input
              id="routing-number"
              placeholder="Enter routing number"
              value={bankData.routingNumber}
              onChange={(e) => setBankData(prev => ({ ...prev, routingNumber: e.target.value }))}
              className="h-12 text-base border-2 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-number" className="text-base font-semibold">Account Number</Label>
            <Input
              id="account-number"
              placeholder="Enter account number"
              value={bankData.accountNumber}
              onChange={(e) => setBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
              className="h-12 text-base border-2 rounded-xl"
              required
            />
          </div>
        </>
      )}

      {paymentType === 'paypal' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="paypal-email" className="text-base font-semibold">PayPal Email</Label>
            <Input
              id="paypal-email"
              type="email"
              placeholder="Enter PayPal email address"
              value={paypalData.email}
              onChange={(e) => setPaypalData(prev => ({ ...prev, email: e.target.value }))}
              className="h-12 text-base border-2 rounded-xl"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paypal-name" className="text-base font-semibold">Account Name</Label>
            <Input
              id="paypal-name"
              placeholder="Enter PayPal account name"
              value={paypalData.accountName}
              onChange={(e) => setPaypalData(prev => ({ ...prev, accountName: e.target.value }))}
              className="h-12 text-base border-2 rounded-xl"
              autoComplete="name"
              required
            />
          </div>
        </>
      )}

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
          disabled={isLoading || (paymentType === 'credit-debit' && !stripe)}
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
  const [clientSecret, setClientSecret] = useState<string>('');

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

  useEffect(() => {
    // Get setup intent client secret when modal opens
    if (isOpen) {
      const getClientSecret = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('create-setup-intent');
          if (error) throw error;
          setClientSecret(data.client_secret);
        } catch (error) {
          console.error('Failed to get client secret:', error);
        }
      };
      getClientSecret();
    }
  }, [isOpen]);

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
            
            {stripePromise && clientSecret ? (
              <Elements 
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                  },
                }}
              >
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
