import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, User, MapPin, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SetupPaymentMethod } from '@/components/payment/SetupPaymentMethod';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export default function PaymentMethods() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'addresses' | 'payment'>('payment');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchPaymentMethods();
  }, [user, navigate]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-payment-methods');
      
      if (error) throw error;
      
      setPaymentMethods(data?.payment_methods || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-payment-method', {
        body: { payment_method_id: paymentMethodId },
      });

      if (error) throw error;

      toast.success('Payment method removed');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to remove payment method');
    }
  };

  const handlePaymentMethodAdded = () => {
    setShowAddPayment(false);
    fetchPaymentMethods();
  };

  const renderTabContent = () => {
    if (activeTab === 'account') {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Account Settings</h2>
          <p className="text-muted-foreground">Manage your account information</p>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm"><strong>Email:</strong> {user?.email}</p>
                <p className="text-sm"><strong>Name:</strong> {user?.user_metadata?.full_name || 'Not set'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (activeTab === 'addresses') {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Shipping Addresses</h2>
          <p className="text-muted-foreground">Manage your saved addresses</p>
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No saved addresses yet</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Payment Methods</h2>
            <p className="text-muted-foreground">Manage your saved payment methods</p>
          </div>
          {paymentMethods.length > 0 && !showAddPayment && (
            <Button onClick={() => setShowAddPayment(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          )}
        </div>

        {showAddPayment ? (
          <SetupPaymentMethod
            onSuccess={handlePaymentMethodAdded}
            onCancel={() => setShowAddPayment(false)}
          />
        ) : loading ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading payment methods...</p>
            </CardContent>
          </Card>
        ) : paymentMethods.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Payment methods</h3>
              <p className="text-muted-foreground mb-4">
                Payment methods are securely managed by Stripe during checkout
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                You can add and manage payment methods during your next purchase
              </p>
              <Button onClick={() => setShowAddPayment(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <Card key={method.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CreditCard className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p className="font-semibold capitalize">{method.brand} •••• {method.last4}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires {method.exp_month}/{method.exp_year}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <Card className="h-fit">
            <CardContent className="p-0">
              <nav className="flex flex-col">
                <button
                  onClick={() => setActiveTab('account')}
                  className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                    activeTab === 'account'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Account</span>
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                    activeTab === 'addresses'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span>Addresses</span>
                </button>
                <button
                  onClick={() => setActiveTab('payment')}
                  className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                    activeTab === 'payment'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Payment</span>
                </button>
              </nav>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="md:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
