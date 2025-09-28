import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, ArrowLeft, ShoppingCart, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLikes } from "@/hooks/useLikes";
import { useShoppingCart } from "@/contexts/ShoppingCartContext";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: number;
  name: string;
  price: number;
  images: string[];
  description: string;
  websiteSaleEnabled: boolean;
}

interface Vendor {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any; // Can be JSON string or array
  created_at: string;
  updated_at: string;
  market_address?: string;
  market_days?: string[];
  market_hours?: any;
  selected_market?: string;
  search_term?: string;
  status: string;
  selected_markets?: any; // Can be JSON string or array
  google_rating?: number;
  google_rating_count?: number;
  latitude?: number;
  longitude?: number;
  vacation_mode?: boolean;
  user_id: string;
}

const CategoryProducts = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();
  const { addItem } = useShoppingCart();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product & { vendorName: string; vendorId: string } | null>(null);
  const [sortBy, setSortBy] = useState<'relevancy' | 'lowest-price' | 'highest-price' | 'top-rated' | 'most-recent'>('relevancy');
  
  const category = searchParams.get('category');

  // Fetch all vendors nationwide for the selected category
  useEffect(() => {
    const fetchNationwideVendors = async () => {
      if (!category) return;
      
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('status', 'accepted')
          .eq('primary_specialty', category);

        if (error) throw error;

        console.log(`Found ${data?.length || 0} vendors nationwide for category: ${category}`);
        setVendors(data || []);
      } catch (error) {
        console.error('Error fetching vendors:', error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNationwideVendors();
  }, [category, toast]);

  // Get all products from all vendors with sorting
  const allProducts = vendors.flatMap(vendor => {
    let products: Product[] = [];
    
    // Handle products data (could be JSON string or array)
    if (vendor.products) {
      try {
        products = Array.isArray(vendor.products) 
          ? vendor.products 
          : JSON.parse(vendor.products as string);
      } catch (e) {
        products = vendor.products as Product[];
      }
    }
    
    return products
      .filter(product => product.websiteSaleEnabled)
      .map(product => ({
        ...product,
        vendorName: vendor.store_name,
        vendorId: vendor.id,
        vendorRating: vendor.google_rating || 0,
        vendorCreatedAt: vendor.created_at
      }));
  });

  // Sort products based on selected option
  const sortedProducts = [...allProducts].sort((a, b) => {
    switch (sortBy) {
      case 'lowest-price':
        return a.price - b.price;
      case 'highest-price':
        return b.price - a.price;
      case 'top-rated':
        return b.vendorRating - a.vendorRating;
      case 'most-recent':
        return new Date(b.vendorCreatedAt).getTime() - new Date(a.vendorCreatedAt).getTime();
      case 'relevancy':
      default:
        return 0; // Keep original order for relevancy
    }
  });

  console.log(`Total products available for purchase: ${sortedProducts.length}`);

  const handleAddToCart = (product: Product & { vendorName: string; vendorId: string }) => {
    addItem({
      id: product.id.toString(),
      product_name: product.name,
      product_description: product.description,
      unit_price: product.price * 100, // Convert to cents
      vendor_id: product.vendorId,
      vendor_name: product.vendorName,
      product_image: product.images?.[0] // Use first image if available
    });
    
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`
    });
  };

  const handleLike = (productId: number, vendorId: string) => {
    toggleLike(`${productId}`, 'product');
  };

  const sortOptions = [
    { value: 'relevancy' as const, label: 'Relevancy' },
    { value: 'lowest-price' as const, label: 'Lowest Price' },
    { value: 'highest-price' as const, label: 'Highest Price' },
    { value: 'top-rated' as const, label: 'Top Rated Store' },
    { value: 'most-recent' as const, label: 'Most Recent' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold">Loading...</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {/* Category Title */}
          <h1 className="text-2xl font-bold capitalize">{category}</h1>
          
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[180px] justify-between">
                Sort by: {sortOptions.find(opt => opt.value === sortBy)?.label}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] bg-background border shadow-lg z-50">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className="cursor-pointer flex items-center justify-between"
                >
                  {option.label}
                  {sortBy === option.value && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Products Grid */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No products available for purchase in this category yet.
            </p>
            <Button onClick={() => navigate('/')}>
              Browse Other Categories
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <Card key={`${product.vendorId}-${product.id}`} className="group hover:shadow-lg transition-all duration-300 overflow-hidden bg-card border-0 shadow-sm rounded-lg">
                <CardContent className="p-0">
                  {/* Product Image with Heart Overlay */}
                  <div 
                    className="aspect-[4/3] bg-muted relative overflow-hidden group"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {product.images?.[0] ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        className="w-full h-full object-cover transition-opacity duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image Available
                      </div>
                    )}
                    
                    {/* Like Button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(product.id, product.vendorId);
                      }}
                    >
                      <Heart 
                        className={`h-4 w-4 transition-colors ${
                          isLiked(`${product.id}`, 'product') 
                            ? 'text-red-500 fill-current' 
                            : 'text-gray-600'
                        }`} 
                      />
                    </Button>
                  </div>

                  {/* Product Information */}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 
                        className="font-normal text-sm flex-1 text-black cursor-pointer"
                        onClick={() => setSelectedProduct(product)}
                      >
                        {product.name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-muted">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/market?vendor=${product.vendorId}`);
                        }}
                        className="text-xs text-black hover:underline cursor-pointer"
                      >
                        {product.vendorName}
                      </button>
                    </div>
                  </CardContent>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={{
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            images: selectedProduct.images,
            description: selectedProduct.description
          }}
          products={[selectedProduct]} // Pass as array for the modal
          open={true}
          onClose={() => setSelectedProduct(null)}
          vendorId={selectedProduct.vendorId}
          vendorName={selectedProduct.vendorName}
        />
      )}
    </div>
  );
};

export default CategoryProducts;