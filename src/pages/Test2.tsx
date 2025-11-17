import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
}

const Test2 = () => {
  const navigate = useNavigate();
  const [recommendedProducts, setRecommendedProducts] = useState<Array<Product & { vendorId: string; vendorName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { toggleLike, isLiked } = useLikes();

  useEffect(() => {
    fetchRecommendedProducts();
  }, []);

  const fetchRecommendedProducts = async () => {
    try {
      const { data: vendors, error } = await supabase
        .from('submissions')
        .select('id, store_name, products')
        .eq('status', 'accepted')
        .not('products', 'is', null)
        .limit(12);

      if (error) throw error;

      // Flatten products from all vendors
      const allProducts: Array<Product & { vendorId: string; vendorName: string }> = [];
      
      vendors?.forEach((vendor) => {
        const products = vendor.products as unknown as Product[];
        if (products && Array.isArray(products)) {
          products.forEach((product: Product) => {
            if (product.images && product.images.length > 0) {
              allProducts.push({
                ...product,
                vendorId: vendor.id,
                vendorName: vendor.store_name,
              });
            }
          });
        }
      });

      // Shuffle and take first 8 products
      const shuffled = allProducts.sort(() => 0.5 - Math.random());
      setRecommendedProducts(shuffled.slice(0, 8));
    } catch (error) {
      console.error('Error fetching recommended products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Farmers Market Banner */}
        <div className="mb-8 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Submit Your Farmers Market for More Exposure
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Get your market in front of thousands of local shoppers and help your community discover fresh, local products
              </p>
            </div>
            <Button 
              size="lg"
              onClick={() => navigate('/submit-market')}
              className="whitespace-nowrap"
            >
              Submit Now
            </Button>
          </div>
        </div>

        {/* Recommended Products Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Recommended Products</h2>
            <Button variant="ghost" onClick={() => navigate('/test')}>
              View All
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : recommendedProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedProducts.map((product) => (
                <Card
                  key={`${product.vendorId}-${product.id}`}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate('/test', { state: { productId: product.id } })}
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {product.images && product.images.length > 0 && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    
                    {/* Like Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(product.id, 'product');
                      }}
                      className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          isLiked(product.id, 'product')
                            ? 'fill-red-500 text-red-500'
                            : 'text-foreground'
                        }`}
                      />
                    </button>

                    {/* Category Badge */}
                    {product.category && (
                      <Badge className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm">
                        {product.category}
                      </Badge>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      {product.vendorName}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Test2;
