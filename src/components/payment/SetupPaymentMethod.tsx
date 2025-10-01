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
import { toast } from 'sonner';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

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
        return_url: `${window.location.origin}/payment-methods`,
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

  useEffect(() => {
    const createSetupIntent = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-setup-intent');

        if (error) {
          console.error('Setup intent error:', error);
          throw error;
        }

        if (data?.client_secret) {
          setClientSecret(data.client_secret);
        } else {
          throw new Error('No client secret returned');
        }
      } catch (error) {
        console.error('Error creating setup intent:', error);
        toast.error('Failed to initialize payment method setup');
        onCancel();
      } finally {
        setLoading(false);
      }
    };

    createSetupIntent();
  }, [onCancel]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        {clientSecret && (
          <Elements options={options} stripe={stripePromise}>
            <SetupForm onSuccess={onSuccess} onCancel={onCancel} />
          </Elements>
        )}
      </CardContent>
    </Card>
  );
};
