import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Star, MapPin } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
}

interface Vendor {
  id: string;
  store_name: string;
  primary_specialty: string;
  description: string;
  products: Product[];
  google_rating: number | null;
  google_rating_count: number | null;
  market_address: string | null;
}

const Test2 = () => {
  const navigate = useNavigate();
  const [recommendedProducts, setRecommendedProducts] = useState<Array<Product & { vendorId: string; vendorName: string }>>([]);
  const [recommendedVendors, setRecommendedVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const { toggleLike, isLiked } = useLikes();

  useEffect(() => {
    fetchRecommendedProducts();
    fetchRecommendedVendors();
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

  const fetchRecommendedVendors = async () => {
    try {
      const { data: vendors, error } = await supabase
        .from('submissions')
        .select('id, store_name, primary_specialty, description, products, google_rating, google_rating_count, market_address')
        .eq('status', 'accepted')
        .not('products', 'is', null)
        .limit(20);

      if (error) throw error;

      // Shuffle and take first 6 vendors
      const shuffled = vendors?.sort(() => 0.5 - Math.random()) || [];
      setRecommendedVendors(shuffled.slice(0, 6) as unknown as Vendor[]);
    } catch (error) {
      console.error('Error fetching recommended vendors:', error);
    } finally {
      setVendorsLoading(false);
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

        {/* Recommended Local Vendors Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Recommended Local Vendors</h2>
            <Button variant="ghost" onClick={() => navigate('/test')}>
              View All
            </Button>
          </div>

          {vendorsLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading vendors...</p>
            </div>
          ) : recommendedVendors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No vendors available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedVendors.map((vendor) => {
                const products = vendor.products as unknown as Product[];
                const firstProductImage = products?.[0]?.images?.[0];
                
                return (
                  <Card
                    key={vendor.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate('/market', { 
                      state: { 
                        type: 'vendor', 
                        selectedVendor: vendor
                      } 
                    })}
                  >
                    {/* Vendor Image */}
                    <div className="aspect-[4/3] bg-muted relative">
                      {firstProductImage ? (
                        <img
                          src={firstProductImage}
                          alt={vendor.store_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-muted-foreground">No image</p>
                        </div>
                      )}
                      
                      {/* Like Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(vendor.id, 'vendor');
                        }}
                        className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                      >
                        <Heart
                          className={`h-5 w-5 ${
                            isLiked(vendor.id, 'vendor')
                              ? 'fill-red-500 text-red-500'
                              : 'text-foreground'
                          }`}
                        />
                      </button>

                      {/* Specialty Badge */}
                      {vendor.primary_specialty && (
                        <Badge className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm">
                          {vendor.primary_specialty}
                        </Badge>
                      )}
                    </div>

                    {/* Vendor Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-1">
                        {vendor.store_name}
                      </h3>
                      
                      {/* Rating */}
                      {vendor.google_rating && (
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{vendor.google_rating.toFixed(1)}</span>
                          {vendor.google_rating_count && (
                            <span className="text-sm text-muted-foreground">
                              ({vendor.google_rating_count})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Location */}
                      {vendor.market_address && (
                        <div className="flex items-center gap-1 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {vendor.market_address}
                          </span>
                        </div>
                      )}

                      {/* Description */}
                      {vendor.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {vendor.description}
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Shop by Category Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Shop by Category</h2>
            <Button variant="ghost" onClick={() => navigate('/test')}>
              View All
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Fresh Flowers & Plants */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/test?category=Fresh Flowers & Plants')}
            >
              <div className="aspect-square bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900 dark:to-purple-900 flex items-center justify-center p-4">
                <span className="text-6xl">🌸</span>
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Fresh Flowers & Plants</h3>
              </div>
            </Card>

            {/* Bakery */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/test?category=Bakery')}
            >
              <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 flex items-center justify-center p-4">
                <span className="text-6xl">🥖</span>
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Bakery</h3>
              </div>
            </Card>

            {/* Dairy */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/test?category=Dairy')}
            >
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 flex items-center justify-center p-4">
                <span className="text-6xl">🧀</span>
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Dairy</h3>
              </div>
            </Card>

            {/* Rancher */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/test?category=Rancher')}
            >
              <div className="aspect-square bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900 dark:to-rose-900 flex items-center justify-center p-4">
                <span className="text-6xl">🥩</span>
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Rancher</h3>
              </div>
            </Card>

            {/* Beverages */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/test?category=Beverages')}
            >
              <div className="aspect-square bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 flex items-center justify-center p-4">
                <span className="text-6xl">🍹</span>
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Beverages</h3>
              </div>
            </Card>

            {/* Farmers */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/test?category=Farmers')}
            >
              <div className="aspect-square bg-gradient-to-br from-lime-100 to-green-100 dark:from-lime-900 dark:to-green-900 flex items-center justify-center p-4">
                <span className="text-6xl">🥕</span>
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Farmers</h3>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test2;
