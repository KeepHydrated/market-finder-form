import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Star, ArrowLeft, ShoppingCart, ChevronDown, Search } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

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
  products: any;
  created_at: string;
  status: string;
  google_rating?: number;
  google_rating_count?: number;
  user_id: string;
}

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();
  const { addItem } = useShoppingCart();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product & { vendorName: string; vendorId: string } | null>(null);
  const [sortBy, setSortBy] = useState<'relevancy' | 'lowest-price' | 'highest-price' | 'top-rated' | 'most-recent'>('relevancy');
  
  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || null;

  // Fetch all vendors and filter products by search query and category
  useEffect(() => {
    const fetchSearchResults = async () => {
      setLoading(true);
      
      try {
        let dbQuery = supabase
          .from('submissions')
          .select('*')
          .eq('status', 'accepted');
        
        // Filter by category if specified
        if (categoryFilter) {
          dbQuery = dbQuery.eq('primary_specialty', categoryFilter);
        }

        const { data, error } = await dbQuery;

        if (error) throw error;

        console.log(`Searching across ${data?.length || 0} vendors${categoryFilter ? ` in category: ${categoryFilter}` : ''} for: "${query}"`);
        setVendors(data || []);
      } catch (error) {
        console.error('Error fetching vendors:', error);
        toast({
          title: "Error",
          description: "Failed to load search results",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, categoryFilter, toast]);

  // Aggregate all products from all vendors
  const allProducts = vendors.flatMap(vendor => {
    const products = typeof vendor.products === 'string' 
      ? JSON.parse(vendor.products) 
      : vendor.products;
    
    if (!Array.isArray(products)) return [];
    
    return products
      .filter((product: Product) => product.websiteSaleEnabled)
      .map((product: Product) => ({
        ...product,
        vendorName: vendor.store_name,
        vendorId: vendor.id,
        vendorRating: vendor.google_rating,
        vendorRatingCount: vendor.google_rating_count,
        vendorCreatedAt: vendor.created_at
      }));
  });

  // Filter products by search query
  const searchFilteredProducts = allProducts.filter(product => {
    const searchLower = query.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.vendorName.toLowerCase().includes(searchLower)
    );
  });

  // Sort products
  const sortedProducts = [...searchFilteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'lowest-price':
        return a.price - b.price;
      case 'highest-price':
        return b.price - a.price;
      case 'top-rated':
        return (b.vendorRating || 0) - (a.vendorRating || 0);
      case 'most-recent':
        return new Date(b.vendorCreatedAt).getTime() - new Date(a.vendorCreatedAt).getTime();
      case 'relevancy':
      default:
        return 0;
    }
  });

  const handleAddToCart = (product: Product & { vendorName: string; vendorId: string }) => {
    addItem({
      id: `${product.vendorId}-${product.id}`,
      product_name: product.name,
      product_description: product.description,
      unit_price: Math.round(product.price * 100), // convert to cents
      quantity: 1,
      vendor_id: product.vendorId,
      vendor_name: product.vendorName,
      product_image: product.images?.[0] || '/placeholder.svg',
    });

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleLike = async (itemId: string) => {
    await toggleLike(itemId, 'product');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
      {/* Mobile Fixed Bar */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-background border-b border-border px-4 py-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground flex-1">
          {sortedProducts.length} {sortedProducts.length === 1 ? 'result' : 'results'}
        </span>
      </div>

        <div className="container mx-auto px-4 pt-8 md:pt-24 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full aspect-square" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
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
      {/* Mobile Fixed Bar */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-background border-b border-border px-4 py-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground flex-1">
          {sortedProducts.length} {sortedProducts.length === 1 ? 'result' : 'results'}
        </span>
      </div>

      <div className="container mx-auto px-4 pt-8 md:pt-24 pb-8">
        {/* Search context header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">
            {categoryFilter || 'All'} | {query}
          </h1>
        </div>

        {/* Sort dropdown - all screens */}
        <div className="pb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {sortedProducts.length} {sortedProducts.length === 1 ? 'result' : 'results'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="py-2">
                <span className="capitalize text-sm">{sortBy.replace('-', ' ')}</span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSortBy('relevancy')}>
                Relevancy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('lowest-price')}>
                Lowest Price
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('highest-price')}>
                Highest Price
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('top-rated')}>
                Top Rated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('most-recent')}>
                Most Recent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Products Grid */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found for "{query}"</p>
            <Button
              onClick={() => navigate('/homepage')}
              variant="outline"
              className="mt-4"
            >
              Browse All Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedProducts.map((product) => (
              <Card 
                key={`${product.vendorId}-${product.id}`}
                className="group overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(`${product.vendorId}-${product.id}`);
                    }}
                  >
                    <Heart 
                      className={`h-4 w-4 ${
                        isLiked(`${product.vendorId}-${product.id}`, 'product')
                          ? 'fill-red-500 text-red-500'
                          : ''
                      }`}
                    />
                  </Button>
                </div>
                
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={product.images?.[0] || '/placeholder.svg'}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{product.vendorName}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">${product.price.toFixed(2)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct as any}
          products={sortedProducts as any[]}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onProductChange={(newProduct) => setSelectedProduct(newProduct as any)}
          vendorId={selectedProduct.vendorId}
          vendorName={selectedProduct.vendorName}
        />
      )}
    </div>
  );
};

export default SearchResults;
