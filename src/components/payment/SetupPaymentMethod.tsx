import React, { useState, useEffect, useMemo } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = async () => {
  if (!stripePromise) {
    const { data, error } = await supabase.functions.invoke('get-stripe-key');
    if (error || !data?.publishableKey) {
      throw new Error('Failed to load Stripe configuration');
    }
    stripePromise = loadStripe(data.publishableKey);
  }
  return stripePromise;
};

interface SetupPaymentMethodProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const SetupForm: React.FC<{ onSuccess: () => void; onCancel: () => void }> = ({
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

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/account`,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      toast.error(result.error.message || 'Failed to add payment method');
      setIsLoading(false);
    } else {
      toast.success('Payment method added successfully!');
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
          {isLoading ? 'Saving...' : 'Save Payment Method'}
        </Button>
      </div>
    </form>
  );
};

export const SetupPaymentMethod: React.FC<SetupPaymentMethodProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        // Load Stripe and setup intent in parallel
        const [stripeInstance, setupIntentData] = await Promise.all([
          getStripe(),
          supabase.functions.invoke('create-setup-intent'),
        ]);

        if (setupIntentData.error) {
          console.error('Setup intent error:', setupIntentData.error);
          throw setupIntentData.error;
        }

        if (!setupIntentData.data?.client_secret) {
          throw new Error('No client secret returned');
        }

        setStripe(stripeInstance);
        setClientSecret(setupIntentData.data.client_secret);
      } catch (error) {
        console.error('Error initializing payment setup:', error);
        toast.error('Failed to initialize payment method setup');
        onCancel();
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [onCancel]);

  const options = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#22c55e',
          borderRadius: '8px',
        },
      },
    };
  }, [clientSecret]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing payment form...</p>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Failed to load payment form</p>
          <Button onClick={onCancel} variant="outline">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  if (!options || !stripe) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <Elements options={options} stripe={stripe}>
          <SetupForm onSuccess={onSuccess} onCancel={onCancel} />
        </Elements>
      </CardContent>
    </Card>
  );
};
