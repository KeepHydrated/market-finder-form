import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, CreditCard } from 'lucide-react';
import { CartItem } from '@/contexts/ShoppingCartContext';

interface OrderConfirmationModalProps {
  items: CartItem[];
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  customerEmail?: string;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  items,
  open,
  onClose,
  onConfirm,
  customerEmail
}) => {
  const [email, setEmail] = useState(customerEmail || '');

  const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.08); // 8% tax
  const total = subtotal + tax;

  // Group items by vendor
  const groupedItems = items.reduce((groups, item) => {
    const vendorId = item.vendor_id;
    if (!groups[vendorId]) {
      groups[vendorId] = {
        vendor_name: item.vendor_name,
        items: [],
      };
    }
    groups[vendorId].items.push(item);
    return groups;
  }, {} as Record<string, { vendor_name: string; items: CartItem[] }>);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Double check your order details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Contact Information</h3>
              <ChevronRight className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-email">Email Address</Label>
              <Input
                id="confirm-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Order Items by Vendor */}
          {Object.values(groupedItems).map((group, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <h3 className="font-medium mb-4">Order from {group.vendor_name}</h3>
              <div className="space-y-4">
                {group.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center gap-4">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{item.product_name}</h4>
                          {item.product_description && (
                            <p className="text-sm text-muted-foreground">
                              {item.product_description}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                        <span className="font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  <span className="text-green-600 font-medium">Pickup available</span> - Ready for pickup at farmers market
                </p>
                <p className="text-sm text-muted-foreground">
                  Standard pickup - <span className="font-medium">FREE</span>
                </p>
              </div>
            </div>
          ))}

          {/* Payment Method */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Payment Method</h3>
              <ChevronRight className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <span className="text-sm text-muted-foreground">
                Payment will be processed securely via Stripe
              </span>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Item(s) total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pickup</span>
              <span className="text-green-600">FREE</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatPrice(tax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Order total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Back to Cart
            </Button>
            <Button 
              onClick={onConfirm} 
              className="flex-1"
              disabled={!email}
            >
              Continue to Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};