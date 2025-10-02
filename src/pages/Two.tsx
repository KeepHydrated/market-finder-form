import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Two() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    paymentType: 'credit-debit',
    cardBrand: '',
    last4Digits: '',
    expMonth: '',
    expYear: '',
    bankName: '',
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    paypalEmail: '',
    paypalAccountName: '',
    setAsDefault: false
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add a payment method.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const paymentMethodData: any = {
        user_id: user.id,
        payment_type: formData.paymentType,
        is_default: formData.setAsDefault,
      };

      if (formData.paymentType === 'credit-debit') {
        paymentMethodData.card_brand = formData.cardBrand;
        paymentMethodData.last_4_digits = formData.last4Digits;
        paymentMethodData.exp_month = formData.expMonth;
        paymentMethodData.exp_year = formData.expYear;
      } else if (formData.paymentType === 'bank') {
        paymentMethodData.bank_name = formData.bankName;
        paymentMethodData.account_holder_name = formData.accountHolderName;
        paymentMethodData.routing_number = formData.routingNumber;
        // Store only last 4 digits of account number
        paymentMethodData.account_number_last_4 = formData.accountNumber.slice(-4);
      } else if (formData.paymentType === 'paypal') {
        paymentMethodData.paypal_email = formData.paypalEmail;
        paymentMethodData.paypal_account_name = formData.paypalAccountName;
      }

      const { error } = await supabase
        .from('payment_methods')
        .insert(paymentMethodData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method added successfully.",
      });

      // Reset form
      setFormData({
        paymentType: 'credit-debit',
        cardBrand: '',
        last4Digits: '',
        expMonth: '',
        expYear: '',
        bankName: '',
        accountHolderName: '',
        routingNumber: '',
        accountNumber: '',
        paypalEmail: '',
        paypalAccountName: '',
        setAsDefault: false
      });
      setIsOpen(false);
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Page 2</h1>
        <Button className="mt-4" onClick={() => setIsOpen(true)}>test</Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Add Payment Method</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="payment-type" className="text-base font-semibold">Payment Type</Label>
                <Select 
                  value={formData.paymentType} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paymentType: value }))}
                >
                  <SelectTrigger className="w-full h-12 text-base border-2 border-black rounded-xl">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="credit-debit" className="text-base py-3">Credit/Debit Card</SelectItem>
                    <SelectItem value="bank" className="text-base py-3">Bank Account</SelectItem>
                    <SelectItem value="paypal" className="text-base py-3">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.paymentType === 'credit-debit' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="card-brand" className="text-base font-semibold">Card Brand</Label>
                    <Input
                      id="card-brand"
                      placeholder="Visa, Mastercard, etc."
                      value={formData.cardBrand}
                      onChange={(e) => setFormData(prev => ({ ...prev, cardBrand: e.target.value }))}
                      className="h-12 text-base border-2 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last-4" className="text-base font-semibold">Last 4 Digits</Label>
                    <Input
                      id="last-4"
                      placeholder="1234"
                      maxLength={4}
                      value={formData.last4Digits}
                      onChange={(e) => setFormData(prev => ({ ...prev, last4Digits: e.target.value }))}
                      className="h-12 text-base border-2 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="exp-month" className="text-base font-semibold">Exp Month</Label>
                      <Input
                        id="exp-month"
                        placeholder="12"
                        maxLength={2}
                        value={formData.expMonth}
                        onChange={(e) => setFormData(prev => ({ ...prev, expMonth: e.target.value }))}
                        className="h-12 text-base border-2 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exp-year" className="text-base font-semibold">Exp Year</Label>
                      <Input
                        id="exp-year"
                        placeholder="2025"
                        maxLength={4}
                        value={formData.expYear}
                        onChange={(e) => setFormData(prev => ({ ...prev, expYear: e.target.value }))}
                        className="h-12 text-base border-2 rounded-xl"
                      />
                    </div>
                  </div>
                </>
              )}

              {formData.paymentType === 'bank' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bank-name" className="text-base font-semibold">Bank Name</Label>
                    <Input
                      id="bank-name"
                      placeholder="Enter bank name"
                      value={formData.bankName}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                      className="h-12 text-base border-2 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-holder" className="text-base font-semibold">Account Holder Name</Label>
                    <Input
                      id="account-holder"
                      placeholder="Enter account holder name"
                      value={formData.accountHolderName}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                      className="h-12 text-base border-2 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="routing-number" className="text-base font-semibold">Routing Number</Label>
                    <Input
                      id="routing-number"
                      placeholder="Enter routing number"
                      value={formData.routingNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, routingNumber: e.target.value }))}
                      className="h-12 text-base border-2 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-number" className="text-base font-semibold">Account Number</Label>
                    <Input
                      id="account-number"
                      placeholder="Enter account number"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                      className="h-12 text-base border-2 rounded-xl"
                    />
                  </div>
                </>
              )}

              {formData.paymentType === 'paypal' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="paypal-email" className="text-base font-semibold">PayPal Email</Label>
                    <Input
                      id="paypal-email"
                      type="email"
                      placeholder="Enter PayPal email address"
                      value={formData.paypalEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, paypalEmail: e.target.value }))}
                      className="h-12 text-base border-2 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paypal-name" className="text-base font-semibold">Account Name</Label>
                    <Input
                      id="paypal-name"
                      placeholder="Enter PayPal account name"
                      value={formData.paypalAccountName}
                      onChange={(e) => setFormData(prev => ({ ...prev, paypalAccountName: e.target.value }))}
                      className="h-12 text-base border-2 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="default"
                  checked={formData.setAsDefault}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, setAsDefault: checked as boolean }))}
                />
                <Label htmlFor="default" className="text-base font-normal cursor-pointer">
                  Set as default payment method
                </Label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 text-base border-2 rounded-xl"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-12 text-base rounded-xl bg-teal-500 hover:bg-teal-600"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Add Payment Method"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
