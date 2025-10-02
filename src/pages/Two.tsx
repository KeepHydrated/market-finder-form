import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

export default function Two() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    paymentType: 'credit-debit',
    cardBrand: '',
    last4Digits: '',
    expMonth: '',
    expYear: '',
    setAsDefault: false
  });

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    setIsOpen(false);
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
                  <SelectContent>
                    <SelectItem value="credit-debit">Credit/Debit Card</SelectItem>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                >
                  Add Payment Method
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
