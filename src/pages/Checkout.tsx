import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShoppingCart } from '@/contexts/ShoppingCartContext';
import { CustomCheckout } from '@/components/shopping/CustomCheckout';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

export default function Checkout() {
  const { items, clearCart } = useShoppingCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCheckoutSuccess = () => {
    clearCart();
    navigate('/order-success');
    toast({
      title: "Payment Successful!",
      description: "Your order has been confirmed.",
    });
  };

  const handleCheckoutCancel = () => {
    navigate('/homepage');
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Your Cart is Empty</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Add some items to your cart before checking out.
            </p>
            <Button onClick={() => navigate('/homepage')} size="lg">
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <CustomCheckout
        items={items}
        onSuccess={handleCheckoutSuccess}
        onCancel={handleCheckoutCancel}
      />
    </div>
  );
}