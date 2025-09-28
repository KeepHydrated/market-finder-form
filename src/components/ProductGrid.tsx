import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, MoreVertical, Copy, Trash2, Heart } from "lucide-react";
import { ProductDetailModal } from "./ProductDetailModal";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string[];
}

interface ProductGridProps {
  products: Product[];
  onDeleteProduct?: (productId: number) => void;
  onDuplicateProduct?: (product: Product) => void;
  vendorId?: string;
  vendorName?: string;
  hideVendorName?: boolean;
}

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
  onDeleteProduct?: (productId: number) => void;
  onDuplicateProduct?: (product: Product) => void;
  vendorId?: string;
  vendorName?: string;
}

const ProductCard = ({ product, onProductClick, onDeleteProduct, onDuplicateProduct, vendorId, vendorName }: ProductCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { toggleLike, isLiked } = useLikes();

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    setCurrentImageIndex((prev) => 
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    setCurrentImageIndex((prev) => 
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={() => onProductClick(product)}
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted relative group rounded-t-lg">
        {product.images.length > 0 ? (
          <>
             <img
               src={product.images[currentImageIndex]}
               alt={`${product.name} - Image ${currentImageIndex + 1}`}
               className="w-full h-full object-cover transition-opacity duration-200 rounded-t-lg"
             />
            
            {/* Like Button */}
            {vendorId && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm z-10"
                onClick={async (e) => {
                  e.stopPropagation();
                  await toggleLike(`${vendorId}-${product.id}`, 'product');
                }}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isLiked(`${vendorId}-${product.id}`, 'product')
                      ? "text-red-500 fill-current" 
                      : "text-gray-600"
                  )} 
                />
              </Button>
            )}
            
            {/* Navigation arrows - only show if more than 1 image */}
            {product.images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 bg-black/80 hover:bg-black text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 bg-black/80 hover:bg-black text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Image indicators */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {product.images.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors duration-200 ${
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
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-normal text-sm flex-1">{product.name}</h3>
          {(onDeleteProduct || onDuplicateProduct) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-32">
                {onDuplicateProduct && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateProduct(product);
                    }}
                    className="cursor-pointer"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                )}
                {onDeleteProduct && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProduct(product.id);
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            ${product.price.toFixed(2)}
          </span>
        </div>
        {vendorName && !onDeleteProduct && (
          <div className="mt-2 pt-2 border-t border-muted">
            <button 
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              {vendorName}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ProductGrid = ({ products, onDeleteProduct, onDuplicateProduct, vendorId, vendorName, hideVendorName = false }: ProductGridProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No products added yet. Click "Add Product" to get started.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onProductClick={handleProductClick}
            onDeleteProduct={onDeleteProduct}
            onDuplicateProduct={onDuplicateProduct}
            vendorId={vendorId}
            vendorName={vendorName}
          />
        ))}
      </div>
      
      <ProductDetailModal
        product={selectedProduct}
        products={products}
        open={isModalOpen}
        onClose={handleCloseModal}
        onProductChange={setSelectedProduct}
        vendorId={vendorId}
        vendorName={vendorName}
        hideVendorName={hideVendorName}
      />
    </>
  );
};