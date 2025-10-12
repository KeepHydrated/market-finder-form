import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useShoppingCart } from '@/contexts/ShoppingCartContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { OrderConfirmationModal } from './OrderConfirmationModal';

export function ShoppingCart() {
  const { 
    items, 
    isOpen, 
    setIsOpen, 
    removeItem, 
    updateQuantity, 
    clearCart,
    getTotalPrice 
  } = useShoppingCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [guestEmail, setGuestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const groupItemsByVendor = () => {
    const grouped: Record<string, typeof items> = {};
    items.forEach(item => {
      if (!grouped[item.vendor_id]) {
        grouped[item.vendor_id] = [];
      }
      grouped[item.vendor_id].push(item);
    });
    return grouped;
  };

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  const handleOrderConfirm = () => {
    setShowOrderConfirm(false);
    setIsOpen(false);
    navigate('/checkout');
  };

  const handleProductClick = (item: any) => {
    const product = {
      id: parseInt(item.id.split('-')[1]) || 1,
      name: item.product_name,
      description: item.product_description || '',
      price: item.unit_price / 100,
      images: item.product_image ? [item.product_image] : []
    };
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const vendorGroups = groupItemsByVendor();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart ({items.length})
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full py-6">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-6">
                {/* Guest email input */}
                {!user && (
                  <div className="space-y-2">
                    <Label htmlFor="guest-email">Email Address</Label>
                    <Input
                      id="guest-email"
                      type="email"
                      placeholder="your@email.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Required for order confirmation and updates
                    </p>
                  </div>
                )}

                {Object.entries(vendorGroups).map(([vendorId, vendorItems]) => {
                  const vendorTotal = vendorItems.reduce(
                    (sum, item) => sum + (item.unit_price * item.quantity), 
                    0
                  );
                  
                  return (
                    <div key={vendorId} className="space-y-4 p-4 border rounded-lg">
                      <div className="flex items-center">
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/market?vendor=${vendorId}`);
                          }}
                          className="font-semibold text-left hover:text-primary transition-colors cursor-pointer"
                        >
                          {vendorItems[0].vendor_name}
                        </button>
                      </div>

                      <div className="space-y-8">
                        {vendorItems.map((item) => (
                          <div key={item.id} className="flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                              {item.product_image && (
                                <button
                                  onClick={() => handleProductClick(item)}
                                  className="flex-shrink-0 hover:opacity-80 transition-opacity"
                                >
                                  <img
                                    src={item.product_image}
                                    alt={item.product_name}
                                    className="w-16 h-16 rounded-lg object-cover cursor-pointer"
                                  />
                                </button>
                              )}
                              <div className="flex-1 min-w-0">
                                <button
                                  onClick={() => handleProductClick(item)}
                                  className="text-left w-full hover:text-primary transition-colors"
                                >
                                  <p className="font-medium line-clamp-2">{item.product_name}</p>
                                </button>
                                <p className="text-sm font-medium mt-1">
                                  {formatPrice(item.unit_price)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(getTotalPrice())}</span>
                </div>
                
                <Button
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={loading || (!user && !guestEmail)}
                >
                  {loading ? 'Processing...' : 'Checkout'}
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearCart}
                >
                  Clear Cart
                </Button>
              </div>
            </>
          )}
        </div>
        <ProductDetailModal
          product={selectedProduct}
          products={selectedProduct ? [selectedProduct] : []}
          open={showProductModal}
          onClose={() => setShowProductModal(false)}
          hideVendorName={true}
        />
        <OrderConfirmationModal
          items={items}
          open={showOrderConfirm}
          onClose={() => setShowOrderConfirm(false)}
          onConfirm={handleOrderConfirm}
          customerEmail={user?.email || guestEmail}
        />
      </SheetContent>
    </Sheet>
  );
}