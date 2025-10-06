import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
}

export const ProductDetailModal = ({ product, products = [], open, onClose, onProductChange, vendorId, vendorName, hideVendorName = false }: ProductDetailModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addItem } = useShoppingCart();
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
    if (e.key === "ArrowRight") goToNextProduct();
    if (e.key === "ArrowLeft") goToPreviousProduct();
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

    addItem({ ...cartItem, quantity: 1 });

    toast({
      title: "Added to Cart",
      description: `${product.name} added to your cart`,
    });

    // Optionally close modal after adding to cart
    // onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto p-0 gap-0 [&>button[data-radix-dialog-close]]:hidden bg-white overflow-visible"
        onKeyDown={handleKeyDown}
      >
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
        

        <div className="flex flex-row w-full bg-white min-h-[400px] relative">
          {/* Product navigation arrows */}
          {hasNext && (
            <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 z-[100]">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextProduct}
                className="h-12 w-12 p-0 rounded-full bg-white hover:bg-gray-50 border-2 border-gray-300 shadow-xl"
              >
                <ChevronRight className="h-6 w-6 text-gray-700" />
              </Button>
            </div>
          )}
          
          {hasPrevious && (
            <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 z-[100]">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousProduct}
                className="h-12 w-12 p-0 rounded-full bg-white hover:bg-gray-50 border-2 border-gray-300 shadow-xl"
              >
                <ChevronLeft className="h-6 w-6 text-gray-700" />
              </Button>
            </div>
          )}
          
          {/* Left side - Images */}
          <div className="w-1/2 relative bg-gray-50">
            <div className="h-[400px] bg-muted relative group">
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
          <div className="w-1/2 p-4 flex flex-col justify-start bg-white border-l border-gray-100">
              <h2 className="text-lg font-bold mb-3 text-gray-900">{product.name}</h2>
              
              <div className="space-y-3 flex-1">
                <div>
                  <span className="text-xl font-bold text-green-600">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
                
                <div>
                  <p className="text-gray-700 leading-relaxed text-xs">
                    {product.description}
                  </p>
                </div>

                {/* Add to Cart Section */}
                {vendorId && vendorName && (
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
  );
};