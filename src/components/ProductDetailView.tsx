import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, ShoppingCart, Heart, ArrowLeft } from "lucide-react";
import { useShoppingCart } from "@/contexts/ShoppingCartContext";
import { useToast } from "@/hooks/use-toast";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string[];
}

interface ProductDetailViewProps {
  product: Product;
  products: Product[];
  onBack: () => void;
  onProductChange?: (product: Product) => void;
  vendorId?: string;
  vendorName?: string;
}

export const ProductDetailView = ({ product, products = [], onBack, onProductChange, vendorId, vendorName }: ProductDetailViewProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showVendorConflict, setShowVendorConflict] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<any>(null);
  const { addItem, clearCart, items } = useShoppingCart();
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();

  const currentProductIndex = products.findIndex(p => p.id === product.id);
  const hasNext = currentProductIndex < products.length - 1;
  const hasPrevious = currentProductIndex > 0;

  const goToNextProduct = () => {
    if (hasNext) {
      setCurrentImageIndex(0);
      onProductChange?.(products[currentProductIndex + 1]);
    }
  };

  const goToPreviousProduct = () => {
    if (hasPrevious) {
      setCurrentImageIndex(0);
      onProductChange?.(products[currentProductIndex - 1]);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  const handleAddToCart = () => {
    if (!vendorId || !vendorName) return;

    const cartItem = {
      id: `${vendorId}-${product.id}`,
      product_name: product.name,
      product_description: product.description,
      unit_price: Math.round(product.price * 100),
      vendor_id: vendorId,
      vendor_name: vendorName,
      product_image: product.images?.[0],
    };

    const success = addItem({ ...cartItem, quantity: 1 });

    if (!success) {
      setPendingCartItem(cartItem);
      setShowVendorConflict(true);
    } else {
      toast({
        title: "Added to Cart",
        description: `${product.name} added to your cart`,
      });
    }
  };

  const handleConfirmClearCart = () => {
    clearCart();
    if (pendingCartItem) {
      addItem({ ...pendingCartItem, quantity: 1 });
      toast({
        title: "Added to Cart",
        description: `${pendingCartItem.product_name} added to your cart`,
      });
    }
    setShowVendorConflict(false);
    setPendingCartItem(null);
  };

  return (
    <>
      <AlertDialog open={showVendorConflict} onOpenChange={setShowVendorConflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Different Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              You already have items from {items[0]?.vendor_name} in your cart.
              You can only order from one vendor at a time. Would you like to clear your cart and add this item from {pendingCartItem?.vendor_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowVendorConflict(false); setPendingCartItem(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClearCart}>
              Clear Cart & Add Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="w-full">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </button>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Image section */}
          <div className="w-full sm:w-1/2 relative">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden relative group">
              {product.images.length > 0 ? (
                <>
                  <img
                    src={product.images[currentImageIndex]}
                    alt={`${product.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {product.images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 p-0 bg-black/70 hover:bg-black text-white rounded-full"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 p-0 bg-black/70 hover:bg-black text-white rounded-full"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>

                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {product.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* Info section */}
          <div className="w-full sm:w-1/2 flex flex-col">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-foreground">{product.name}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (vendorId) {
                    await toggleLike(`${vendorId}-${product.id}`, 'product');
                  }
                }}
                className={cn(
                  "h-9 w-9 p-0 rounded-full",
                  vendorId && isLiked(`${vendorId}-${product.id}`, 'product')
                    ? "text-red-500 hover:text-red-600"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Heart
                  className={cn(
                    "h-5 w-5",
                    vendorId && isLiked(`${vendorId}-${product.id}`, 'product') && "fill-current"
                  )}
                />
              </Button>
            </div>

            <p className="text-lg font-semibold text-muted-foreground mt-1">
              ${product.price.toFixed(2)}
            </p>

            <p className="text-muted-foreground leading-relaxed mt-4">
              {product.description}
            </p>

            {vendorId && vendorName && (
              <div className="mt-6">
                <Button className="w-full" onClick={handleAddToCart}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            )}

            {/* Product navigation */}
            {products.length > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousProduct}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentProductIndex + 1} of {products.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextProduct}
                  disabled={!hasNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
