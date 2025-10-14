import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, X, ShoppingCart, Plus, Minus, Heart } from "lucide-react";
import { useShoppingCart } from "@/contexts/ShoppingCartContext";
import { useToast } from "@/hooks/use-toast";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string[];
}

interface ProductDetailModalProps {
  product: Product | null;
  products: Product[];
  open: boolean;
  onClose: () => void;
  onProductChange?: (product: Product) => void;
  vendorId?: string;
  vendorName?: string;
  hideVendorName?: boolean;
  hideAddToCart?: boolean;
}

export const ProductDetailModal = ({ product, products = [], open, onClose, onProductChange, vendorId, vendorName, hideVendorName = false, hideAddToCart = false }: ProductDetailModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showVendorConflict, setShowVendorConflict] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<any>(null);
  const { addItem, clearCart, items, getCurrentVendorId } = useShoppingCart();
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();
  const navigate = useNavigate();

  if (!product || !products.length) return null;

  const currentProductIndex = products.findIndex(p => p.id === product.id);
  const hasNext = currentProductIndex < products.length - 1;
  const hasPrevious = currentProductIndex > 0;

  console.log('🎯 MODAL - Current product:', product.name, 'at index:', currentProductIndex);
  console.log('🎯 MODAL - All products:', products.map(p => p.name));
  console.log('🎯 MODAL - Navigation:', { hasNext, hasPrevious });

  const goToNextProduct = () => {
    if (hasNext) {
      const nextProduct = products[currentProductIndex + 1];
      console.log('➡️ Going to NEXT product:', nextProduct.name);
      setCurrentImageIndex(0);
      onProductChange?.(nextProduct);
    }
  };

  const goToPreviousProduct = () => {
    if (hasPrevious) {
      const previousProduct = products[currentProductIndex - 1];
      console.log('⬅️ Going to PREVIOUS product:', previousProduct.name);
      setCurrentImageIndex(0);
      onProductChange?.(previousProduct);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
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

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCurrentImageIndex(0); // Reset image index when closing
      onClose();
    }
  };

  const handleAddToCart = () => {
    if (!product || !vendorId || !vendorName) {
      toast({
        title: "Error",
        description: "Unable to add item to cart. Missing product or vendor information.",
        variant: "destructive",
      });
      return;
    }

    const cartItem = {
      id: `${vendorId}-${product.id}`,
      product_name: product.name,
      product_description: product.description,
      unit_price: Math.round(product.price * 100), // Convert to cents
      vendor_id: vendorId,
      vendor_name: vendorName,
      product_image: product.images?.[0], // Use first image if available
    };

    const success = addItem({ ...cartItem, quantity: 1 });

    if (!success) {
      // Show confirmation dialog if adding from different vendor
      const currentVendor = items[0]?.vendor_name;
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
            <AlertDialogCancel onClick={() => {
              setShowVendorConflict(false);
              setPendingCartItem(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClearCart}>
              Clear Cart & Add Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
        className="max-w-[85vw] sm:max-w-[600px] max-h-[65vh] sm:max-h-[80vh] overflow-y-auto p-0 gap-0 [&>button[data-radix-dialog-close]]:hidden bg-white overflow-visible"
        onKeyDown={handleKeyDown}
      >
        {/* Product Navigation Arrows - Mobile: top corners, Desktop: sides */}
        {products.length > 1 && hasPrevious && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousProduct();
            }}
            className="absolute top-3 left-3 z-[70] h-10 w-10 p-0 bg-white hover:bg-gray-100 border border-gray-200 shadow-md rounded-full md:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        
        {products.length > 1 && hasNext && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              goToNextProduct();
            }}
            className="absolute top-3 right-14 z-[70] h-10 w-10 p-0 bg-white hover:bg-gray-100 border border-gray-200 shadow-md rounded-full md:hidden"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        {/* Desktop navigation arrows on sides */}
        {products.length > 1 && hasPrevious && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousProduct();
            }}
            className="absolute -left-12 top-1/2 -translate-y-1/2 h-12 w-12 p-0 bg-white hover:bg-gray-100 border border-gray-200 shadow-lg rounded-full z-[70] hidden md:flex items-center justify-center"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        
        {products.length > 1 && hasNext && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              goToNextProduct();
            }}
            className="absolute -right-12 top-1/2 -translate-y-1/2 h-12 w-12 p-0 bg-white hover:bg-gray-100 border border-gray-200 shadow-lg rounded-full z-[70] hidden md:flex items-center justify-center"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
          <DialogDescription className="sr-only">{product.description}</DialogDescription>
        
        {/* Heart button positioned at top right of entire modal */}
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (product && vendorId) {
              await toggleLike(`${vendorId}-${product.id}`, 'product');
            }
          }}
          className={cn(
            "absolute top-3 right-3 z-[60] h-10 w-10 p-0 rounded-full bg-white/90 hover:bg-white border border-gray-200 shadow-sm transition-all",
            product && vendorId && isLiked(`${vendorId}-${product.id}`, 'product')
              ? "text-red-500 hover:text-red-600"
              : "text-gray-600 hover:text-gray-800"
          )}
        >
          <Heart 
            className={cn(
              "h-5 w-5 transition-colors",
              product && vendorId && isLiked(`${vendorId}-${product.id}`, 'product') && "fill-current"
            )} 
          />
        </Button>
        

        <div className="flex flex-col sm:flex-row w-full bg-white min-h-[250px] sm:min-h-[400px] relative">
          {/* Left side - Images */}
          <div className="w-full sm:w-1/2 relative bg-gray-50">
            <div className="h-[200px] sm:h-[400px] bg-muted relative group">
                {product.images.length > 0 ? (
                  <>
                    <img
                      src={product.images[currentImageIndex]}
                      alt={`${product.name} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Navigation arrows - only show if more than 1 image */}
                    {product.images.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 bg-black/80 hover:bg-black text-white"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 bg-black/80 hover:bg-black text-white"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                        
                        {/* Image indicators */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                          {product.images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-3 h-3 rounded-full transition-colors duration-200 ${
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

          {/* Right side - Product info */}
          <div className="w-full sm:w-1/2 p-3 sm:p-4 flex flex-col justify-start bg-white sm:border-l border-gray-100">
              <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">{product.name}</h2>
              
              <div className="space-y-2 sm:space-y-3 flex-1">
                <div>
                  <span className="text-base font-semibold text-muted-foreground">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
                
                <div>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {product.description}
                  </p>
                </div>

                {/* Add to Cart Section */}
                {vendorId && vendorName && !hideAddToCart && (
                  <div className="pt-3 border-t border-gray-200">
                    <Button
                      className="w-full h-8 text-sm"
                      onClick={handleAddToCart}
                    >
                      <ShoppingCart className="h-3 w-3 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Store name at the very bottom of right column */}
              {vendorId && vendorName && !hideVendorName && (
                <div className="mt-auto pt-3 border-t border-gray-200">
                  <div className="flex justify-start">
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/market?id=${vendorId}`);
                      }}
                      className="text-sm text-black hover:text-gray-800"
                    >
                      {vendorName}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};