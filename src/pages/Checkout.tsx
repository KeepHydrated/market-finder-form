import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShoppingCart } from '@/contexts/ShoppingCartContext';
import { CustomCheckout } from '@/components/shopping/CustomCheckout';
import { useToast } from '@/hooks/use-toast';

export default function Checkout() {
  const { items, clearCart } = useShoppingCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/');
      toast({
        title: "Cart is empty",
        description: "Add some items to your cart before checking out.",
        variant: "destructive",
      });
    }
  }, [items.length, navigate, toast]);

  const handleCheckoutSuccess = () => {
    clearCart();
    navigate('/order-success');
    toast({
      title: "Payment Successful!",
      description: "Your order has been confirmed.",
    });
  };

  const handleCheckoutCancel = () => {
    navigate('/');
  };

  if (items.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <CustomCheckout
        items={items}
        onSuccess={handleCheckoutSuccess}
        onCancel={handleCheckoutCancel}
      />
    </div>
  );
}