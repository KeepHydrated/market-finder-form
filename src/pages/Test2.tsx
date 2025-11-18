import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Star, MapPin } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import farmersMarketBanner from "@/assets/farmers-market-banner.jpg";

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
  selected_markets?: any;
}

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
}

const Test2 = () => {
  const navigate = useNavigate();
  const [recommendedProducts, setRecommendedProducts] = useState<Array<Product & { vendorId: string; vendorName: string }>>([]);
  const [recommendedVendors, setRecommendedVendors] = useState<Vendor[]>([]);
  const [recommendedMarkets, setRecommendedMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const { toggleLike, isLiked } = useLikes();
  
  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentVendorProducts, setCurrentVendorProducts] = useState<any[]>([]);
  const [currentVendorId, setCurrentVendorId] = useState<string | undefined>(undefined);
  const [currentVendorName, setCurrentVendorName] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchRecommendedProducts();
    fetchRecommendedVendors();
    fetchRecommendedMarkets();
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

  const fetchRecommendedMarkets = async () => {
    try {
      const { data: markets, error } = await supabase
        .from('markets')
        .select('id, name, address, city, state, days, hours, google_rating, google_rating_count')
        .limit(20);

      if (error) throw error;

      // Shuffle and take first 6 markets
      const shuffled = markets?.sort(() => 0.5 - Math.random()) || [];
      setRecommendedMarkets(shuffled.slice(0, 6) as Market[]);
    } catch (error) {
      console.error('Error fetching recommended markets:', error);
    } finally {
      setMarketsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Farmers Market Banner */}
        <div className="mb-8 rounded-lg overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            <div className="flex-1 p-6 md:p-8 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Submit Your Farmers Market for More Exposure
              </h2>
              <p className="text-muted-foreground text-sm md:text-base mb-4 md:mb-6">
                Get your market in front of thousands of local shoppers and help your community discover fresh, local products
              </p>
              <Button 
                size="lg"
                onClick={() => navigate('/my-shop')}
                className="whitespace-nowrap"
              >
                Submit Now
              </Button>
            </div>
            <div className="w-full md:w-1/2 h-48 md:h-64">
              <img 
                src={farmersMarketBanner} 
                alt="Fresh farmers market produce" 
                className="w-full h-full object-cover"
              />
            </div>
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
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={async () => {
                    // Fetch the vendor's full product list
                    const { data: vendor } = await supabase
                      .from('submissions')
                      .select('products')
                      .eq('id', product.vendorId)
                      .single();
                    
                    if (vendor) {
                      // Set up the product modal
                      const productWithId = {
                        ...product,
                        id: product.id
                      };
                      setSelectedProduct(productWithId);
                      // Store vendor info separately
                      setCurrentVendorId(product.vendorId);
                      setCurrentVendorName(product.vendorName);
                      // Ensure all vendor products have IDs
                      const vendorProducts = vendor.products as unknown as Product[];
                      const productsWithIds = (vendorProducts || []).map((p: any, idx: number) => ({
                        ...p,
                        id: p.id || idx
                      }));
                      setCurrentVendorProducts(productsWithIds);
                      setIsProductModalOpen(true);
                    }
                  }}
                >
                  {/* Product Image */}
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden group">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name || 'Product'}
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
                      onClick={async (e) => {
                        e.stopPropagation();
                        await toggleLike(`${product.vendorId}-${product.id}`, 'product');
                      }}
                    >
                      <Heart 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isLiked(`${product.vendorId}-${product.id}`, 'product')
                            ? "text-red-500 fill-current" 
                            : "text-gray-600"
                        )}
                      />
                    </Button>
                  </div>

                  {/* Product Information */}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-normal text-sm flex-1 text-black">
                        {product.name || 'Product'}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        ${(product.price || 0).toFixed(2)}
                      </span>
                    </div>
                    {product.vendorName && (
                      <div className="mt-2 pt-2 border-t border-muted">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/test');
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {product.vendorName}
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Local Vendors Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Recommended Vendors</h2>
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
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden group">
                      {firstProductImage ? (
                        <img
                          src={firstProductImage}
                          alt={vendor.store_name}
                          className="w-full h-full object-cover transition-opacity duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image Available
                        </div>
                      )}
                      
                      {/* Star Rating Badge - Top Left */}
                      {vendor.google_rating && (
                        <Badge className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm shadow-sm flex items-center gap-1 px-2 py-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{vendor.google_rating.toFixed(1)}</span>
                          {vendor.google_rating_count && (
                            <span className="text-xs text-muted-foreground">
                              ({vendor.google_rating_count})
                            </span>
                          )}
                        </Badge>
                      )}
                      
                      {/* Like Button - Top Right */}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await toggleLike(vendor.id, 'vendor');
                        }}
                      >
                        <Heart 
                          className={cn(
                            "h-4 w-4 transition-colors",
                            isLiked(vendor.id, 'vendor')
                              ? "text-red-500 fill-current" 
                              : "text-gray-600"
                          )}
                        />
                      </Button>

                      {/* Specialty Badge - Bottom Left */}
                      {vendor.primary_specialty && (
                        <Badge className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm shadow-sm text-green-600 border-0">
                          {vendor.primary_specialty}
                        </Badge>
                      )}
                      
                      {/* Distance Badge - Bottom Right (placeholder for now) */}
                      <Badge className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm shadow-sm">
                        212.8 mi
                      </Badge>
                    </div>

                    {/* Vendor Info */}
                    <CardContent className="p-4 space-y-2">
                      {/* Store Name */}
                      <h3 className="font-bold text-lg text-black">
                        {vendor.store_name}
                      </h3>
                      
                      {/* Market Name with Navigation - placeholder */}
                      {vendor.selected_markets && Array.isArray(vendor.selected_markets) && vendor.selected_markets.length > 0 && (
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span className="text-foreground">{vendor.selected_markets[0]?.name || 'Market Name'}</span>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <button className="hover:text-foreground">←</button>
                            <span className="text-xs">1/{vendor.selected_markets.length}</span>
                            <button className="hover:text-foreground">→</button>
                          </div>
                        </div>
                      )}

                      {/* Address */}
                      {vendor.market_address && (
                        <div className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {vendor.market_address}
                          </span>
                        </div>
                      )}
                    </CardContent>
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

        {/* Recommended Local Markets Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Recommended Local Markets</h2>
            <Button variant="ghost" onClick={() => navigate('/')}>
              View All
            </Button>
          </div>

          {marketsLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading markets...</p>
            </div>
          ) : recommendedMarkets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No markets available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedMarkets.map((market) => (
                <Card
                  key={market.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate('/', { state: { searchTerm: market.name } })}
                >
                  {/* Market Image Placeholder */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 flex items-center justify-center p-4 relative overflow-hidden group">
                    <span className="text-6xl">🏪</span>
                    
                    {/* Star Rating Badge - Top Left */}
                    {market.google_rating && (
                      <Badge className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm shadow-sm flex items-center gap-1 px-2 py-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{market.google_rating.toFixed(1)}</span>
                        {market.google_rating_count && (
                          <span className="text-xs text-muted-foreground">
                            ({market.google_rating_count})
                          </span>
                        )}
                      </Badge>
                    )}
                    
                    {/* Like Button - Top Right */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await toggleLike(market.id.toString(), 'market');
                      }}
                    >
                      <Heart 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isLiked(market.id.toString(), 'market')
                            ? "text-red-500 fill-current" 
                            : "text-gray-600"
                        )}
                      />
                    </Button>
                    
                    {/* Distance Badge - Bottom Right (placeholder) */}
                    <Badge className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm shadow-sm">
                      212.8 mi
                    </Badge>
                  </div>

                  {/* Market Info */}
                  <CardContent className="p-4 space-y-2">
                    {/* Market Name */}
                    <h3 className="font-bold text-lg text-black">
                      {market.name}
                    </h3>

                    {/* Address */}
                    <div className="flex items-start gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {market.address && `${market.address}, `}{market.city}, {market.state}
                      </span>
                    </div>

                    {/* Days Open */}
                    {market.days && market.days.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {market.days.slice(0, 3).map((day, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-green-50 text-green-700 border-0">
                            {day}
                          </Badge>
                        ))}
                        {market.days.length > 3 && (
                          <Badge variant="secondary" className="text-xs bg-muted">
                            +{market.days.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        open={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={selectedProduct}
        products={currentVendorProducts}
        vendorId={currentVendorId}
        vendorName={currentVendorName}
      />
    </div>
  );
};

export default Test2;
