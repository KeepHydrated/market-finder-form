import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PaymentMethodCard from '@/components/payment/PaymentMethodCard';

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
  const [paymentType, setPaymentType] = useState<PaymentType>('card');
  
  // Card form state
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  
  // PayPal form state
  const [paypalEmail, setPaypalEmail] = useState('');
  
  // Apple Pay form state
  const [applePayEmail, setApplePayEmail] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    try {
      let insertData: any = {
        user_id: user.id,
        payment_type: paymentType,
        is_default: paymentMethods.length === 0,
      };

      if (paymentType === 'card') {
        if (!cardholderName || !cardNumber || !expMonth || !expYear) {
          toast.error('Please fill in all card fields');
          return;
        }
        insertData = {
          ...insertData,
          cardholder_name: cardholderName,
          card_last_four: cardNumber.slice(-4),
          card_brand: cardBrand || 'Unknown',
          card_exp_month: parseInt(expMonth),
          card_exp_year: parseInt(expYear),
        };
      } else if (paymentType === 'paypal') {
        if (!paypalEmail) {
          toast.error('Please enter PayPal email');
          return;
        }
        insertData = {
          ...insertData,
          paypal_email: paypalEmail,
        };
      } else if (paymentType === 'apple_pay') {
        if (!applePayEmail) {
          toast.error('Please enter Apple Pay email');
          return;
        }
        insertData = {
          ...insertData,
          apple_pay_email: applePayEmail,
        };
      }

      const { error } = await supabase
        .from('payment_methods')
        .insert([insertData]);

      if (error) throw error;

      toast.success('Payment method added successfully');
      resetForm();
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Failed to add payment method');
    }
  };

  const resetForm = () => {
    setCardholderName('');
    setCardNumber('');
    setCardBrand('');
    setExpMonth('');
    setExpYear('');
    setPaypalEmail('');
    setApplePayEmail('');
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
      {/* Add Payment Method Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Payment Method</CardTitle>
          <CardDescription>
            Choose your payment method type and enter the details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label>Payment Type</Label>
              <RadioGroup value={paymentType} onValueChange={(value) => setPaymentType(value as PaymentType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="cursor-pointer">Credit/Debit Card</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="cursor-pointer">PayPal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="apple_pay" id="apple_pay" />
                  <Label htmlFor="apple_pay" className="cursor-pointer">Apple Pay</Label>
                </div>
              </RadioGroup>
            </div>

            {paymentType === 'card' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardBrand">Card Brand</Label>
                  <Input
                    id="cardBrand"
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    placeholder="Visa, Mastercard, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expMonth">Exp Month</Label>
                    <Input
                      id="expMonth"
                      type="number"
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      placeholder="MM"
                      min="1"
                      max="12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expYear">Exp Year</Label>
                    <Input
                      id="expYear"
                      type="number"
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      placeholder="YYYY"
                      min={new Date().getFullYear()}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentType === 'paypal' && (
              <div className="space-y-2">
                <Label htmlFor="paypalEmail">PayPal Email</Label>
                <Input
                  id="paypalEmail"
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
            )}

            {paymentType === 'apple_pay' && (
              <div className="space-y-2">
                <Label htmlFor="applePayEmail">Apple Pay Email</Label>
                <Input
                  id="applePayEmail"
                  type="email"
                  value={applePayEmail}
                  onChange={(e) => setApplePayEmail(e.target.value)}
                  placeholder="your@icloud.com"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full">
              Add Payment Method
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Saved Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Payment Methods</CardTitle>
          <CardDescription>
            Manage your saved payment methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading payment methods...</p>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No payment methods</h3>
              <p className="text-muted-foreground">
                Add a payment method to get started
              </p>
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
