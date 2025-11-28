import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Star, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import farmersMarketBanner from "@/assets/farmers-market-banner.jpg";
import categoryFlowers from "@/assets/category-flowers.jpg";
import categoryBakery from "@/assets/category-bakery.jpg";
import categoryDairy from "@/assets/category-dairy.jpg";
import categoryRancher from "@/assets/category-rancher.jpg";
import categoryBeverages from "@/assets/category-beverages.jpg";
import categoryFarmers from "@/assets/category-farmers.jpg";

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
  latitude: number | null;
  longitude: number | null;
  selected_markets?: any;
  market_days?: string[];
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
  vendors?: Vendor[];
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
  
  // Distance calculation state
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [vendorDistances, setVendorDistances] = useState<Record<string, string>>({});
  const [vendorMarketIndices, setVendorMarketIndices] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchRecommendedProducts();
    fetchRecommendedVendors();
    fetchRecommendedMarkets();
    getUserLocation();
  }, []);

  // Get user's current location with fallback to profile zipcode
  const getUserLocation = async () => {
    // Try GPS first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 Got GPS location:', position.coords);
          setUserCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        async (error) => {
          console.log('GPS location denied, trying profile zipcode fallback');
          // Fallback to profile zipcode
          await getLocationFromProfile();
        }
      );
    } else {
      // No geolocation support, try profile zipcode
      await getLocationFromProfile();
    }
  };

  // Get location from user's profile zipcode
  const getLocationFromProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('zipcode')
        .eq('user_id', user.id)
        .single();

      if (profile?.zipcode) {
        console.log('📍 Using profile zipcode:', profile.zipcode);
        const { data, error } = await supabase.functions.invoke('geocode-distance', {
          body: { address: profile.zipcode }
        });

        if (!error && data?.latitude && data?.longitude) {
          console.log('📍 Got coordinates from zipcode:', data);
          setUserCoordinates({
            lat: data.latitude,
            lng: data.longitude
          });
        }
      }
    } catch (error) {
      console.error('Error getting location from profile:', error);
    }
  };

  // Calculate straight-line distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get Google Maps driving distance
  const getGoogleMapsDistance = async (
    originLat: number, 
    originLng: number, 
    destLat: number, 
    destLng: number
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-distance', {
        body: {
          origin: { lat: originLat, lng: originLng },
          destination: { lat: destLat, lng: destLng }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting Google Maps distance:', error);
      return null;
    }
  };

  // Calculate distances for vendors
  const calculateVendorDistances = async (vendors: Vendor[], userCoords: {lat: number, lng: number}) => {
    const newDistances: Record<string, string> = {};
    
    for (const vendor of vendors) {
      try {
        if (vendor.latitude && vendor.longitude) {
          const vendorCoords = {
            lat: Number(vendor.latitude),
            lng: Number(vendor.longitude)
          };
          
          // Try Google Maps distance first
          const googleDistance = await getGoogleMapsDistance(
            userCoords.lat, 
            userCoords.lng, 
            vendorCoords.lat, 
            vendorCoords.lng
          );
          
          let finalDistance = '-- mi';
          
          if (googleDistance && googleDistance.distanceMiles) {
            finalDistance = `${googleDistance.distanceMiles.toFixed(1)} mi`;
          } else {
            // Fallback to straight-line distance
            const distanceInMiles = calculateDistance(
              userCoords.lat, 
              userCoords.lng, 
              vendorCoords.lat, 
              vendorCoords.lng
            );
            finalDistance = `${distanceInMiles.toFixed(1)} mi`;
          }
          
          newDistances[vendor.id] = finalDistance;
        } else {
          newDistances[vendor.id] = '-- mi';
        }
      } catch (error) {
        console.error(`Error calculating distance for ${vendor.store_name}:`, error);
        newDistances[vendor.id] = '-- mi';
      }
    }
    
    setVendorDistances(newDistances);
  };

  // Calculate distances when vendors and location are available
  useEffect(() => {
    if (recommendedVendors.length > 0 && userCoordinates) {
      calculateVendorDistances(recommendedVendors, userCoordinates);
    }
  }, [recommendedVendors, userCoordinates]);

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
        .select('id, store_name, primary_specialty, description, products, google_rating, google_rating_count, market_address, latitude, longitude, selected_markets, market_days')
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
      // First fetch markets
      const { data: markets, error: marketsError } = await supabase
        .from('markets')
        .select('id, name, address, city, state, days, hours, google_rating, google_rating_count')
        .limit(20);

      if (marketsError) throw marketsError;

      if (!markets || markets.length === 0) {
        setRecommendedMarkets([]);
        return;
      }

      // Fetch all vendors
      const { data: vendors, error: vendorsError } = await supabase
        .from('submissions')
        .select('id, store_name, products, selected_markets, market_address')
        .eq('status', 'accepted');

      if (vendorsError) throw vendorsError;

      // Group vendors by market - use more flexible matching
      const marketsWithVendors = markets.map(market => {
        const marketVendors = vendors?.filter(vendor => {
          // Check if vendor's selected_markets or market_address matches this market
          const selectedMarkets = vendor.selected_markets;
          const marketAddress = vendor.market_address;
          
          // Try matching by selected_markets
          if (selectedMarkets && Array.isArray(selectedMarkets)) {
            const hasMatch = selectedMarkets.some((m: any) => {
              const marketName = typeof m === 'string' ? m : (m?.name || '');
              const marketAddr = typeof m === 'string' ? '' : (m?.address || '');
              
              // Match by name or address
              return marketName.toLowerCase().includes(market.name.toLowerCase()) ||
                     market.name.toLowerCase().includes(marketName.toLowerCase()) ||
                     (marketAddr && market.address.toLowerCase().includes(marketAddr.toLowerCase())) ||
                     (marketAddr && marketAddr.toLowerCase().includes(market.address.toLowerCase()));
            });
            if (hasMatch) return true;
          }
          
          // Try matching by market_address
          if (marketAddress) {
            return market.address.toLowerCase().includes(marketAddress.toLowerCase()) ||
                   marketAddress.toLowerCase().includes(market.address.toLowerCase()) ||
                   market.name.toLowerCase().includes(marketAddress.toLowerCase());
          }
          
          return false;
        }) || [];

        return {
          ...market,
          vendors: marketVendors
        };
      });

      // Show all markets, even without vendors (will show placeholder)
      const shuffled = marketsWithVendors.sort(() => 0.5 - Math.random());
      setRecommendedMarkets(shuffled.slice(0, 3) as any);
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
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Fetch the vendor data to navigate to their store
                            const { data: vendor } = await supabase
                              .from('submissions')
                              .select('*')
                              .eq('id', product.vendorId)
                              .single();
                            
                            if (vendor) {
                              navigate('/market', { 
                                state: { 
                                  type: 'vendor', 
                                  selectedVendor: vendor
                                } 
                              });
                            }
                          }}
                          className="text-xs text-black hover:underline cursor-pointer"
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
                      <div className="absolute top-3 left-3 z-10">
                        <div className="flex items-center gap-1.5 bg-[#e8f5e9] rounded-full px-3 py-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm text-gray-600">
                            {(vendor.google_rating || 0).toFixed(1)} <span className="text-gray-400">({vendor.google_rating_count || 0})</span>
                          </span>
                        </div>
                      </div>
                      
                      {/* Like Button - Top Right */}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
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

                      {/* Distance Badge - Bottom Right */}
                      {vendorDistances[vendor.id] && vendorDistances[vendor.id] !== '-- mi' && (
                        <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                          <span className="text-xs font-medium text-gray-700">{vendorDistances[vendor.id]}</span>
                        </div>
                      )}

                      {/* Category Badge - Bottom Left */}
                      {vendor.primary_specialty && (
                        <Badge className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm shadow-sm border-0 rounded-full px-3 py-1.5 hover:bg-white/90">
                          <span className="font-medium text-sm text-green-600">{vendor.primary_specialty}</span>
                        </Badge>
                      )}

                    </div>
                    
                    {/* Store Information */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-lg font-semibold text-foreground text-left">
                        {vendor.store_name.length > 20 
                          ? `${vendor.store_name.slice(0, 20)}...`
                          : vendor.store_name
                        }
                      </h3>

                      {/* Market Details Section with Carousel */}
                      <div className="mt-2">
                        {(() => {
                          // Get all markets for this vendor - handle various data structures
                          let allMarkets = [];
                          
                          try {
                            let marketsData = vendor.selected_markets;
                            
                            // If it's a string, parse it
                            if (typeof marketsData === 'string') {
                              try {
                                marketsData = JSON.parse(marketsData);
                              } catch (e) {
                                console.error('Failed to parse markets JSON:', e);
                                marketsData = null;
                              }
                            }
                            
                            if (marketsData && Array.isArray(marketsData)) {
                              allMarkets = marketsData.map((market: any) => {
                                // Handle string format (old format)
                                if (typeof market === 'string') {
                                  return { name: market, address: vendor.market_address || '' };
                                }
                                // Handle object format (new format)
                                if (market && typeof market === 'object') {
                                  // Ensure we extract strings, not objects
                                  const marketName = String(market.name || market.structured_formatting?.main_text || 'Farmers Market');
                                  const marketAddress = String(market.address || market.structured_formatting?.secondary_text || vendor.market_address || '');
                                  return { name: marketName, address: marketAddress };
                                }
                                // Fallback
                                return { name: String(market), address: vendor.market_address || '' };
                              });
                            } else {
                              // Fallback to single market
                              allMarkets = [{ 
                                name: String(vendor.market_address || "Farmers Market"),
                                address: String(vendor.market_address || '')
                              }];
                            }
                          } catch (error) {
                            console.error('Error parsing markets:', error);
                            // Ultimate fallback
                            allMarkets = [{ 
                              name: String(vendor.market_address || "Farmers Market"),
                              address: String(vendor.market_address || '')
                            }];
                          }
                          
                          const currentIndex = vendorMarketIndices[vendor.id] || 0;
                          const currentMarket = allMarkets[currentIndex] || allMarkets[0] || { name: 'Farmers Market', address: '' };
                          const hasMultipleMarkets = allMarkets.length > 1;

                          return (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-foreground">
                                      {String(currentMarket.name || 'Farmers Market')}
                                    </h4>
                                    {hasMultipleMarkets && (
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setVendorMarketIndices(prev => ({
                                              ...prev,
                                              [vendor.id]: (currentIndex - 1 + allMarkets.length) % allMarkets.length
                                            }));
                                          }}
                                          className="p-1 hover:bg-muted rounded transition-colors"
                                          aria-label="Previous market"
                                        >
                                          <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-xs text-muted-foreground">
                                          {currentIndex + 1}/{allMarkets.length}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setVendorMarketIndices(prev => ({
                                              ...prev,
                                              [vendor.id]: (currentIndex + 1) % allMarkets.length
                                            }));
                                          }}
                                          className="p-1 hover:bg-muted rounded transition-colors"
                                          aria-label="Next market"
                                        >
                                          <ChevronRight className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {currentMarket.address && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                      <p className="text-sm text-muted-foreground">
                                        {String(currentMarket.address).replace(/,\s*United States\s*$/i, '').trim()}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Market Days Badges */}
                                  {vendor.market_days && vendor.market_days.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {vendor.market_days.map((day: string) => (
                                        <Badge 
                                          key={day} 
                                          className="text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-100 border-0"
                                        >
                                          {day}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
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
            <Button variant="ghost" onClick={() => navigate('/search')}>
              View All
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Fresh Flowers & Plants */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/search?category=Fresh Flowers & Plants')}
            >
              <div className="aspect-square bg-muted overflow-hidden">
                <img 
                  src={categoryFlowers} 
                  alt="Fresh Flowers & Plants" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Fresh Flowers & Plants</h3>
              </div>
            </Card>

            {/* Bakery */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/search?category=Bakery')}
            >
              <div className="aspect-square bg-muted overflow-hidden">
                <img 
                  src={categoryBakery} 
                  alt="Bakery" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Bakery</h3>
              </div>
            </Card>

            {/* Dairy */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/search?category=Dairy')}
            >
              <div className="aspect-square bg-muted overflow-hidden">
                <img 
                  src={categoryDairy} 
                  alt="Dairy" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Dairy</h3>
              </div>
            </Card>

            {/* Rancher */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/search?category=Rancher')}
            >
              <div className="aspect-square bg-muted overflow-hidden">
                <img 
                  src={categoryRancher} 
                  alt="Rancher" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Rancher</h3>
              </div>
            </Card>

            {/* Beverages */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/search?category=Beverages')}
            >
              <div className="aspect-square bg-muted overflow-hidden">
                <img 
                  src={categoryBeverages} 
                  alt="Beverages" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 text-center">
                <h3 className="font-semibold text-sm text-foreground">Beverages</h3>
              </div>
            </Card>

            {/* Farmers */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate('/search?category=Farmers')}
            >
              <div className="aspect-square bg-muted overflow-hidden">
                <img 
                  src={categoryFarmers} 
                  alt="Farmers" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
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
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer rounded-2xl"
                  onClick={() => navigate('/market', { 
                    state: { 
                      type: 'market', 
                      selectedMarket: market 
                    } 
                  })}
                >
                  {/* Vendor Images Collage */}
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {/* Google Rating Badge - Top Left */}
                    {market.google_rating && (
                      <div className="absolute top-2 left-2 z-10 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs font-medium">
                            {market.google_rating.toFixed(1)}
                          </span>
                          {market.google_rating_count && (
                            <span className="text-xs text-gray-600">
                              ({market.google_rating_count})
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Like Button - Top Right */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                        await toggleLike(marketId, 'market');
                      }}
                    >
                      <Heart 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          (() => {
                            const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                            return isLiked(marketId, 'market') 
                              ? "text-red-500 fill-current" 
                              : "text-gray-600";
                          })()
                        )} 
                      />
                    </Button>
                    
                    {/* Vendor Image Collage */}
                    {!market.vendors || market.vendors.length === 0 ? (
                      // No vendors - show placeholder
                      <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                        <span className="text-6xl">🏪</span>
                      </div>
                    ) : market.vendors.length === 1 ? (
                      // Single vendor
                      <div className="w-full h-full">
                        {market.vendors[0].products && 
                         Array.isArray(market.vendors[0].products) &&
                         market.vendors[0].products.length > 0 && 
                         market.vendors[0].products[0].images && 
                         market.vendors[0].products[0].images.length > 0 ? (
                          <img 
                            src={market.vendors[0].products[0].images[0]}
                            alt={market.vendors[0].store_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                            <div className="text-green-600 text-lg font-medium">
                              {market.vendors[0].store_name}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : market.vendors.length === 2 ? (
                      // Two vendors - split layout
                      <div className="grid grid-cols-2 h-full gap-0.5">
                        {market.vendors.slice(0, 2).map((vendor, vendorIndex) => (
                          <div key={vendorIndex} className="relative overflow-hidden">
                            {vendor.products && 
                             Array.isArray(vendor.products) &&
                             vendor.products.length > 0 && 
                             vendor.products[0].images && 
                             vendor.products[0].images.length > 0 ? (
                              <img 
                                src={vendor.products[0].images[0]}
                                alt={vendor.store_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                                <div className="text-green-600 text-sm font-medium text-center">
                                  {vendor.store_name}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : market.vendors.length === 3 ? (
                      // Three vendors - one large, two small
                      <div className="grid grid-cols-2 h-full gap-0.5">
                        <div className="relative overflow-hidden">
                          {market.vendors[0].products && 
                           Array.isArray(market.vendors[0].products) &&
                           market.vendors[0].products.length > 0 && 
                           market.vendors[0].products[0].images && 
                           market.vendors[0].products[0].images.length > 0 ? (
                            <img 
                              src={market.vendors[0].products[0].images[0]}
                              alt={market.vendors[0].store_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                              <div className="text-green-600 text-sm font-medium text-center">
                                {market.vendors[0].store_name}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-rows-2 gap-0.5">
                          {market.vendors.slice(1, 3).map((vendor, vendorIndex) => (
                            <div key={vendorIndex} className="relative overflow-hidden">
                              {vendor.products && 
                               Array.isArray(vendor.products) &&
                               vendor.products.length > 0 && 
                               vendor.products[0].images && 
                               vendor.products[0].images.length > 0 ? (
                                <img 
                                  src={vendor.products[0].images[0]}
                                  alt={vendor.store_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                                  <div className="text-green-600 text-xs font-medium text-center p-1">
                                    {vendor.store_name}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Four or more vendors - 2x2 grid
                      <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                        {market.vendors.slice(0, 4).map((vendor, vendorIndex) => (
                          <div key={vendorIndex} className="relative overflow-hidden">
                            {vendor.products && 
                             Array.isArray(vendor.products) &&
                             vendor.products.length > 0 && 
                             vendor.products[0].images && 
                             vendor.products[0].images.length > 0 ? (
                              <img 
                                src={vendor.products[0].images[0]}
                                alt={vendor.store_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                                <div className="text-green-600 text-xs font-medium text-center p-1">
                                  {vendor.store_name}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Distance Badge - Bottom Right (placeholder) */}
                    <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                      <span className="text-xs font-medium text-gray-700">
                        -- miles
                      </span>
                    </div>
                  </div>

                  {/* Market Info */}
                  <div className="p-4 space-y-3">
                    <h3 className="text-base font-semibold text-foreground text-left">
                      {market.name}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {market.address.replace(/,\s*United States\s*$/i, '').trim()}
                      </p>
                    </div>

                    {/* Market Days Badges */}
                    {market.days && market.days.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {market.days.map((day: string) => (
                          <Badge 
                            key={day} 
                            className="text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-100 border-0"
                          >
                            {day}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
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
