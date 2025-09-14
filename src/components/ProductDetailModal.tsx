import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, X, ShoppingCart, Plus, Minus, Heart } from "lucide-react";
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

interface ProductDetailModalProps {
  product: Product | null;
  products: Product[];
  open: boolean;
  onClose: () => void;
  onProductChange?: (product: Product) => void;
  vendorId?: string;
  vendorName?: string;
}

export const ProductDetailModal = ({ product, products = [], open, onClose, onProductChange, vendorId, vendorName }: ProductDetailModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useShoppingCart();
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();

  if (!product || !products.length) return null;

  const currentProductIndex = products.findIndex(p => p.id === product.id);
  const hasPrevious = currentProductIndex > 0;
  const hasNext = currentProductIndex < products.length - 1;

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (hasPrevious) {
      const previousProduct = products[currentProductIndex - 1];
      setCurrentImageIndex(0);
      onProductChange?.(previousProduct);
    }
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (hasNext) {
      const nextProduct = products[currentProductIndex + 1];
      setCurrentImageIndex(0);
      onProductChange?.(nextProduct);
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

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCurrentImageIndex(0); // Reset image index when closing
      setQuantity(1); // Reset quantity when closing
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
    };

    addItem({ ...cartItem, quantity });

    toast({
      title: "Added to Cart",
      description: `${quantity} ${product.name} added to your cart`,
    });

    // Optionally close modal after adding to cart
    // onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0 gap-0 [&>button[data-radix-dialog-close]]:hidden">
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
        {/* Navigation arrows positioned outside the modal content */}
        {hasPrevious && (
          <Button
            variant="secondary"
            size="lg"
            onClick={goToPrevious}
            className="fixed left-[calc(50vw-550px)] top-1/2 transform -translate-y-1/2 z-50 h-12 w-12 p-0 bg-black/80 hover:bg-black text-white shadow-lg rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        
        {hasNext && (
          <Button
            variant="secondary"
            size="lg" 
            onClick={goToNext}
            className="fixed right-[calc(50vw-550px)] top-1/2 transform -translate-y-1/2 z-50 h-12 w-12 p-0 bg-black/80 hover:bg-black text-white shadow-lg rounded-full"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}

        <div className="flex flex-col md:flex-row min-h-0 w-full">
          {/* Left side - Images */}
          <div className="md:w-1/2 relative">

              <div className="aspect-square bg-muted relative group">
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
            <div className="md:w-1/2 p-6 flex flex-col">
              <h2 className="text-2xl font-bold mb-6">{product.name}</h2>
              
              <div className="space-y-6">
                <div>
                  <span className="text-xl font-medium text-foreground">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
                
                <div>
                  <p className="text-foreground leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Add to Cart Section */}
                {vendorId && vendorName && (
                  <div className="space-y-4 pt-6 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleAddToCart}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart - ${(product.price * quantity).toFixed(2)}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );
};