import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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
}

export const ProductDetailModal = ({ product, products = [], open, onClose, onProductChange }: ProductDetailModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
      onClose();
    }
  };

  return (
    <>
      {/* External navigation arrows - rendered outside Dialog */}
      {open && hasPrevious && (
        <Button
          variant="secondary"
          size="lg"
          onClick={goToPrevious}
          className="fixed left-4 top-1/2 transform -translate-y-1/2 z-[60] h-12 w-12 p-0 bg-white/90 hover:bg-white border-2 border-border shadow-lg"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}
      
      {open && hasNext && (
        <Button
          variant="secondary"
          size="lg"
          onClick={goToNext}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 z-[60] h-12 w-12 p-0 bg-white/90 hover:bg-white border-2 border-border shadow-lg"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0 gap-0 flex [&>button]:hidden">
          <div className="flex flex-col md:flex-row min-h-0 w-full">
            {/* Left side - Images */}
            <div className="md:w-1/2 relative">
              {/* Close button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 h-8 w-8 p-0 bg-white/80 hover:bg-white"
              >
                <X className="h-4 w-4" />
              </Button>

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
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 bg-white/80 hover:bg-white"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 bg-white/80 hover:bg-white"
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
                  <span className="text-3xl font-bold text-primary">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
                
                <div>
                  <p className="text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};