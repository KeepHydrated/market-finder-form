import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PaymentMethodCard from '@/components/payment/PaymentMethodCard';
import AddPaymentDialog from '@/components/payment/AddPaymentDialog';

type PaymentType = 'card' | 'paypal' | 'apple_pay';

interface PaymentMethod {
  id: string;
  payment_type: PaymentType;
  card_last_four?: string;
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  cardholder_name?: string;
  paypal_email?: string;
  apple_pay_email?: string;
  is_default: boolean;
}

export function PaymentMethodsManager() {
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
    <div className="space-y-6">
      <AddPaymentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchPaymentMethods}
      />

      {/* Saved Payment Methods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Your Payment Methods</CardTitle>
            <CardDescription>
              Manage your saved payment methods
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
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
              <p className="text-muted-foreground mb-6">
                Add a payment method to get started
              </p>
              <Button 
                onClick={() => setShowAddDialog(true)} 
                size="lg"
                className="bg-gradient-primary"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  onSetDefault={handleSetDefault}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentMethodsManager;
