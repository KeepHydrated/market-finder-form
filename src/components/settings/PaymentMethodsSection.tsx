import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, Trash2, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AddPaymentDialog from '@/components/payment/AddPaymentDialog';

interface PaymentMethod {
  id: string;
  payment_type: string;
  card_last_four?: string;
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  cardholder_name?: string;
  paypal_email?: string;
  apple_pay_email?: string;
  is_default: boolean;
}

export default function PaymentMethodsSection() {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
    }
  }, [user]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Payment method removed');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to remove payment method');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('Default payment method updated');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to set default payment method');
    }
  };

  return (
    <>
      <AddPaymentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchPaymentMethods}
      />

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div>
              <CardTitle>Your Payment Methods</CardTitle>
            </div>
            <div>
              <CardDescription>
                Manage your saved payment methods
              </CardDescription>
            </div>
            <div>
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="bg-primary hover:bg-primary/90 w-full"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Payment Method
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading payment methods...</p>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No payment methods</h3>
              <p className="text-muted-foreground">
                Add a payment method to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      {method.payment_type === 'card' && (
                        <>
                          <p className="font-medium">
                            {method.card_brand} •••• {method.card_last_four}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires {method.card_exp_month}/{method.card_exp_year}
                          </p>
                        </>
                      )}
                      {method.payment_type === 'paypal' && (
                        <>
                          <p className="font-medium">PayPal</p>
                          <p className="text-sm text-muted-foreground">
                            {method.paypal_email}
                          </p>
                        </>
                      )}
                      {method.payment_type === 'apple_pay' && (
                        <>
                          <p className="font-medium">Apple Pay</p>
                          <p className="text-sm text-muted-foreground">
                            {method.apple_pay_email}
                          </p>
                        </>
                      )}
                    </div>
                    {method.is_default && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                        <Star className="h-3 w-3 fill-current" />
                        Default
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(method.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
