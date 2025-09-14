import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { useShoppingCart } from '@/contexts/ShoppingCartContext';

export function CartButton() {
  const { getTotalItems, setIsOpen } = useShoppingCart();
  const itemCount = getTotalItems();

  return (
    <Button
      variant="outline"
      size="sm"
      className="relative"
      onClick={() => setIsOpen(true)}
    >
      <ShoppingCart className="h-4 w-4" />
      {itemCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {itemCount}
        </Badge>
      )}
    </Button>
  );
}