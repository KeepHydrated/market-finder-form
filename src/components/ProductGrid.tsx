import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductDetailModal } from "./ProductDetailModal";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string[];
}

interface ProductGridProps {
  products: Product[];
}

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
}

const ProductCard = ({ product, onProductClick }: ProductCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
      <div className="aspect-[4/3] overflow-hidden bg-muted relative group">
        {product.images.length > 0 ? (
          <>
            <img
              src={product.images[currentImageIndex]}
              alt={`${product.name} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-200"
            />
            
            {/* Navigation arrows - only show if more than 1 image */}
            {product.images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 bg-black/80 hover:bg-black text-white border border-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 bg-black/80 hover:bg-black text-white border border-white"
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
        <h3 className="font-semibold text-lg mb-3">{product.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-muted-foreground">
            ${product.price.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export const ProductGrid = ({ products }: ProductGridProps) => {
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
          />
        ))}
      </div>
      
      <ProductDetailModal
        product={selectedProduct}
        products={products}
        open={isModalOpen}
        onClose={handleCloseModal}
        onProductChange={setSelectedProduct}
      />
    </>
  );
};