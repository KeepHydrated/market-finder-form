import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useLikes } from "@/hooks/useLikes";
import { getCoordinatesForAddress, calculateDistance } from "@/lib/geocoding";
import { ProductDetailModal } from "@/components/ProductDetailModal";

interface AcceptedSubmission {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any[];
  selected_market: string;
  selected_markets?: any;
  search_term: string;
  market_address?: string;
  market_days?: string[];
  market_hours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>;
  created_at: string;
  latitude?: number;
  longitude?: number;
  google_rating?: number;
  google_rating_count?: number;
  distance?: number;
}

interface VendorRating {
  vendorId: string;
  averageRating: number;
  totalReviews: number;
}

const Test3 = () => {
  const navigate = useNavigate();
  const { toggleLike, isLiked } = useLikes();
  const [recommendedVendors, setRecommendedVendors] = useState<AcceptedSubmission[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Array<any & { vendorId: string; vendorName: string }>>([]);
  const [recommendedMarkets, setRecommendedMarkets] = useState<Array<{ name: string; address: string; days: string[]; vendors: AcceptedSubmission[] }>>([]);
  const [vendorRatings, setVendorRatings] = useState<Record<string, VendorRating>>({});
  const [vendorDistances, setVendorDistances] = useState<Record<string, string>>({});
  const [marketDistances, setMarketDistances] = useState<Record<string, string>>({});
  const [marketGoogleRatings, setMarketGoogleRatings] = useState<Record<string, { rating: number; reviewCount: number }>>({});
  const [vendorMarketIndices, setVendorMarketIndices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
  
  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentVendorProducts, setCurrentVendorProducts] = useState<any[]>([]);
  const [currentVendorId, setCurrentVendorId] = useState<string | undefined>(undefined);
  const [currentVendorName, setCurrentVendorName] = useState<string | undefined>(undefined);

  useEffect(() => {
    getUserLocation();
    fetchRecommendedVendors();
    fetchRecommendedProducts();
    fetchRecommendedMarkets();
  }, []);

  const getUserLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.latitude && data.longitude) {
        setUserCoordinates({ lat: data.latitude, lng: data.longitude });
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const fetchRecommendedVendors = async () => {
    try {
      const { data: vendors, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'accepted')
        .not('products', 'is', null)
        .limit(20);

      if (error) throw error;

      if (vendors) {
        const vendorsWithImages = (vendors as any[]).filter((v: any) => {
          return v.products && Array.isArray(v.products) && v.products.some((p: any) => 
            p.images && Array.isArray(p.images) && p.images.length > 0
          );
        });

        const shuffled = vendorsWithImages.sort(() => 0.5 - Math.random()).slice(0, 9) as AcceptedSubmission[];
        setRecommendedVendors(shuffled);

        const { data: reviews } = await supabase
          .from('reviews')
          .select('vendor_id, rating')
          .in('vendor_id', shuffled.map((v: any) => v.id));

        if (reviews) {
          const ratingsMap: Record<string, VendorRating> = {};
          reviews.forEach((review: any) => {
            if (!ratingsMap[review.vendor_id]) {
              ratingsMap[review.vendor_id] = {
                vendorId: review.vendor_id,
                averageRating: 0,
                totalReviews: 0,
              };
            }
            ratingsMap[review.vendor_id].averageRating += review.rating || 0;
            ratingsMap[review.vendor_id].totalReviews += 1;
          });

          Object.keys(ratingsMap).forEach(vendorId => {
            ratingsMap[vendorId].averageRating = 
              ratingsMap[vendorId].averageRating / ratingsMap[vendorId].totalReviews;
          });

          setVendorRatings(ratingsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching recommended vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userCoordinates && recommendedVendors.length > 0) {
      calculateVendorDistances();
    }
  }, [userCoordinates, recommendedVendors]);

  const calculateVendorDistances = async () => {
    if (!userCoordinates) return;

    const distances: Record<string, string> = {};

    for (const vendor of recommendedVendors) {
      if (vendor.market_address) {
        try {
          const coords = await getCoordinatesForAddress(vendor.market_address);
          if (coords) {
            const distance = calculateDistance(
              userCoordinates.lat,
              userCoordinates.lng,
              coords.lat,
              coords.lng
            );
            distances[vendor.id] = `${distance.toFixed(1)} mi`;
          }
        } catch (error) {
          console.error('Error calculating distance:', error);
        }
      }
    }

    setVendorDistances(distances);
  };

  const fetchRecommendedProducts = async () => {
    try {
      const { data: vendors, error } = await supabase
        .from('submissions')
        .select('id, store_name, products')
        .eq('status', 'accepted')
        .not('products', 'is', null)
        .limit(12);

      if (error) throw error;

      const allProducts: Array<any & { vendorId: string; vendorName: string }> = [];
      
      vendors?.forEach((vendor: any) => {
        const products = vendor.products as any[];
        if (products && Array.isArray(products)) {
          products.forEach((product: any) => {
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

      const shuffled = allProducts.sort(() => 0.5 - Math.random());
      setRecommendedProducts(shuffled.slice(0, 8));
    } catch (error) {
      console.error('Error fetching recommended products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchRecommendedMarkets = async () => {
    try {
      const { data: vendors, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'accepted')
        .not('products', 'is', null)
        .limit(30);

      if (error) throw error;

      if (vendors) {
        const vendorsWithImages = (vendors as any[]).filter((v: any) => {
          return v.products && Array.isArray(v.products) && v.products.some((p: any) => 
            p.images && Array.isArray(p.images) && p.images.length > 0
          );
        });

        // Group vendors by market
        const marketMap = new Map<string, AcceptedSubmission[]>();
        
        vendorsWithImages.forEach((vendor: any) => {
          let markets = [];
          
          try {
            let marketsData = vendor.selected_markets;
            if (typeof marketsData === 'string') {
              try {
                marketsData = JSON.parse(marketsData);
              } catch (e) {
                console.error('Failed to parse markets data:', e);
              }
            }
            
            if (Array.isArray(marketsData)) {
              markets = marketsData.filter((m: any) => m && (typeof m === 'object' ? m.name || m.marketName : m));
            }
          } catch (error) {
            console.error('Error processing markets:', error);
          }

          markets.forEach((market: any) => {
            const marketName = typeof market === 'object' ? (market.name || market.marketName) : market;
            const marketAddress = typeof market === 'object' ? market.address : vendor.market_address;
            const marketKey = `${marketName}-${marketAddress}`;
            
            if (!marketMap.has(marketKey)) {
              marketMap.set(marketKey, []);
            }
            marketMap.get(marketKey)?.push(vendor as AcceptedSubmission);
          });
        });

        // Convert to array and take top markets
        const marketsArray = Array.from(marketMap.entries()).map(([key, vendors]) => {
          const firstVendor = vendors[0];
          let marketInfo = { name: '', address: '', days: [] as string[] };
          
          try {
            let marketsData = firstVendor.selected_markets;
            if (typeof marketsData === 'string') {
              marketsData = JSON.parse(marketsData);
            }
            
            if (Array.isArray(marketsData)) {
              const market = marketsData.find((m: any) => {
                const name = typeof m === 'object' ? (m.name || m.marketName) : m;
                const address = typeof m === 'object' ? m.address : firstVendor.market_address;
                return `${name}-${address}` === key;
              });
              
              if (market) {
                marketInfo.name = typeof market === 'object' ? (market.name || market.marketName) : market;
                marketInfo.address = typeof market === 'object' ? market.address : firstVendor.market_address || '';
                marketInfo.days = firstVendor.market_days || [];
              }
            }
          } catch (error) {
            console.error('Error extracting market info:', error);
          }

          return {
            name: marketInfo.name,
            address: marketInfo.address,
            days: marketInfo.days,
            vendors
          };
        }).filter(m => m.name && m.address);

        // Shuffle and take first 6
        const shuffled = marketsArray.sort(() => 0.5 - Math.random()).slice(0, 6);
        setRecommendedMarkets(shuffled);

        // Fetch Google ratings for markets
        const marketIds = shuffled.map(m => `${m.name}-${m.address}`.replace(/\s+/g, '-').toLowerCase());
        const ratingsMap: Record<string, { rating: number; reviewCount: number }> = {};
        
        for (const market of shuffled) {
          const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
          const avgRating = market.vendors.reduce((sum, v) => sum + (v.google_rating || 0), 0) / market.vendors.length;
          const totalReviews = market.vendors.reduce((sum, v) => sum + (v.google_rating_count || 0), 0);
          
          ratingsMap[marketId] = {
            rating: avgRating,
            reviewCount: totalReviews
          };
        }
        
        setMarketGoogleRatings(ratingsMap);
      }
    } catch (error) {
      console.error('Error fetching recommended markets:', error);
    } finally {
      setMarketsLoading(false);
    }
  };

  useEffect(() => {
    if (userCoordinates && recommendedMarkets.length > 0) {
      calculateMarketDistances();
    }
  }, [userCoordinates, recommendedMarkets]);

  const calculateMarketDistances = async () => {
    if (!userCoordinates) return;

    const distances: Record<string, string> = {};

    for (const market of recommendedMarkets) {
      if (market.address) {
        try {
          const coords = await getCoordinatesForAddress(market.address);
          if (coords) {
            const distance = calculateDistance(
              userCoordinates.lat,
              userCoordinates.lng,
              coords.lat,
              coords.lng
            );
            const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
            distances[marketId] = `${distance.toFixed(1)} mi`;
          }
        } catch (error) {
          console.error('Error calculating market distance:', error);
        }
      }
    }

    setMarketDistances(distances);
  };

  if (loading || productsLoading || marketsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading recommended vendors...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Recommended Products Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Recommended Products</h2>
          {recommendedProducts.length === 0 ? (
            <div className="text-center">
              <p className="text-muted-foreground">No recommended products available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recommendedProducts.map((product, index) => (
                <Card 
                  key={`${product.vendorId}-${index}`}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    const productWithId = {
                      ...product,
                      id: product.id || index
                    };
                    setSelectedProduct(productWithId);
                    setCurrentVendorId(product.vendorId);
                    setCurrentVendorName(product.vendorName);
                    
                    const vendor = recommendedVendors.find(v => v.id === product.vendorId);
                    if (vendor) {
                      const productsWithIds = (vendor.products || []).map((p: any, idx: number) => ({
                        ...p,
                        id: p.id || idx
                      }));
                      setCurrentVendorProducts(productsWithIds);
                    }
                    setIsProductModalOpen(true);
                  }}
                >
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
                            const vendor = recommendedVendors.find(v => v.id === product.vendorId);
                            if (vendor) {
                              navigate('/market', { 
                                state: { 
                                  type: 'vendor', 
                                  selectedVendor: vendor,
                                  allVendors: recommendedVendors
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
        </section>

        {/* Recommended Markets Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Recommended Markets</h2>
          {recommendedMarkets.length === 0 ? (
            <div className="text-center">
              <p className="text-muted-foreground">No recommended markets available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedMarkets.map((market, index) => (
                <Card 
                  key={index}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                    const marketDistance = marketDistances[marketId];
                    
                    navigate('/market', { 
                      state: { 
                        type: 'market', 
                        selectedMarket: market,
                        allVendors: market.vendors,
                        marketDistance: marketDistance
                      } 
                    });
                  }}
                >
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    <div className="absolute top-2 left-2 z-10 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-xs font-medium">
                          {(() => {
                            const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                            return marketGoogleRatings[marketId]?.rating?.toFixed(1) || '0.0';
                          })()}
                        </span>
                        <span className="text-xs text-gray-600">
                          ({(() => {
                            const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                            return marketGoogleRatings[marketId]?.reviewCount || 0;
                          })()})
                        </span>
                      </div>
                    </div>

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

                    {market.vendors.length === 1 ? (
                      <div className="w-full h-full">
                        {market.vendors[0].products && 
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
                            <div className="text-green-600 text-sm font-medium text-center p-2">
                              {market.vendors[0].store_name}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : market.vendors.length === 2 ? (
                      <div className="grid grid-cols-2 h-full gap-0.5">
                        {market.vendors.slice(0, 2).map((vendor, vendorIndex) => (
                          <div key={vendorIndex} className="relative overflow-hidden">
                            {vendor.products && 
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
                    ) : market.vendors.length === 3 ? (
                      <div className="h-full flex gap-0.5">
                        <div className="w-1/2 relative overflow-hidden">
                          {market.vendors[0].products && 
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
                              <div className="text-green-600 text-xs font-medium text-center p-1">
                                {market.vendors[0].store_name}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="w-1/2 flex flex-col gap-0.5">
                          {market.vendors.slice(1, 3).map((vendor, vendorIndex) => (
                            <div key={vendorIndex} className="h-1/2 relative overflow-hidden">
                              {vendor.products && 
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
                      <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                        {market.vendors.slice(0, 4).map((vendor, vendorIndex) => (
                          <div key={vendorIndex} className="relative overflow-hidden">
                            {vendor.products && 
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

                    <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                      <span className="text-xs font-medium text-gray-700">
                        {(() => {
                          const marketId = `${market.name}-${market.address}`.replace(/\s+/g, '-').toLowerCase();
                          return marketDistances[marketId] || '-- mi';
                        })()}
                      </span>
                    </div>
                  </div>

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
                    
                    <p className="text-sm text-foreground">
                      {market.vendors.length} vendor{market.vendors.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recommended Vendors Section */}
        <h1 className="text-3xl font-bold mb-8">Recommended Vendors</h1>
        
        {recommendedVendors.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground">No recommended vendors available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedVendors.map((submission) => (
              <Card 
                key={submission.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer rounded-2xl" 
                onClick={async () => {
                  const cachedCoords = submission.market_address 
                    ? await getCoordinatesForAddress(submission.market_address)
                    : null;
                  
                  navigate('/market', { 
                    state: { 
                      type: 'vendor', 
                      selectedVendor: submission,
                      allVendors: recommendedVendors,
                      marketCoordinates: cachedCoords
                    } 
                  });
                }}
              >
                <div className="aspect-[4/3] bg-muted relative">
                  {submission.products && submission.products.length > 0 && submission.products[0].images && submission.products[0].images.length > 0 ? (
                    <img 
                      src={submission.products[0].images[0]} 
                      alt={submission.products[0].name || 'Product'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image Available
                    </div>
                  )}
                  
                  {((submission.google_rating && submission.google_rating > 0) || (vendorRatings[submission.id]?.totalReviews > 0)) && (
                    <Badge className="absolute top-3 left-3 bg-white backdrop-blur-sm shadow-lg flex items-center gap-1.5 px-3 py-1.5 border-0 rounded-full hover:bg-white">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {submission.google_rating && submission.google_rating > 0
                          ? submission.google_rating.toFixed(1)
                          : vendorRatings[submission.id]?.averageRating.toFixed(1)
                        }
                      </span>
                      {(submission.google_rating_count || vendorRatings[submission.id]?.totalReviews) && (
                        <span className="text-sm text-gray-600">
                          ({submission.google_rating_count || vendorRatings[submission.id]?.totalReviews || 0})
                        </span>
                      )}
                    </Badge>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 h-11 w-11 p-0 bg-white hover:bg-white rounded-full shadow-lg border-0"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await toggleLike(submission.id, 'vendor');
                    }}
                  >
                    <Heart 
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isLiked(submission.id, 'vendor')
                          ? "text-red-500 fill-red-500" 
                          : "text-red-500"
                      )}
                    />
                  </Button>

                  {vendorDistances[submission.id] && vendorDistances[submission.id] !== '-- mi' && (
                    <Badge className="absolute bottom-3 right-3 bg-white backdrop-blur-sm shadow-lg border-0 rounded-full px-3 py-1.5 hover:bg-white">
                      <span className="font-semibold text-sm text-gray-900">{vendorDistances[submission.id]}</span>
                    </Badge>
                  )}
                </div>
                
                <div className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground text-left">
                    {submission.store_name.length > 20 
                      ? `${submission.store_name.slice(0, 20)}...`
                      : submission.store_name
                    }
                  </h3>

                  <div className="mt-2">
                    {(() => {
                      let allMarkets = [];
                      
                      try {
                        let marketsData = submission.selected_markets;
                        
                        if (typeof marketsData === 'string') {
                          try {
                            marketsData = JSON.parse(marketsData);
                          } catch (e) {
                            console.error('Failed to parse markets data:', e);
                          }
                        }
                        
                        if (Array.isArray(marketsData)) {
                          allMarkets = marketsData.filter(m => m && (typeof m === 'object' ? m.name || m.marketName : m));
                        }
                      } catch (error) {
                        console.error('Error processing markets:', error);
                      }

                      if (allMarkets.length === 0) {
                        return null;
                      }

                      const currentIndex = vendorMarketIndices[submission.id] || 0;
                      const currentMarket = allMarkets[currentIndex];
                      
                      const marketName = typeof currentMarket === 'object' 
                        ? (currentMarket.name || currentMarket.marketName)
                        : currentMarket;
                      
                      const marketAddress = typeof currentMarket === 'object'
                        ? currentMarket.address
                        : submission.market_address;

                      return (
                        <>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-foreground">
                                  {String(marketName)}
                                </h4>
                                {allMarkets.length > 1 && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setVendorMarketIndices(prev => ({
                                          ...prev,
                                          [submission.id]: currentIndex === 0 ? allMarkets.length - 1 : currentIndex - 1
                                        }));
                                      }}
                                      className="p-1 hover:bg-muted rounded transition-colors"
                                      aria-label="Previous market"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <span className="min-w-[2.5rem] text-center">
                                      {currentIndex + 1}/{allMarkets.length}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setVendorMarketIndices(prev => ({
                                          ...prev,
                                          [submission.id]: (currentIndex + 1) % allMarkets.length
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
                              {marketAddress && (
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <p className="text-sm text-muted-foreground">
                                    {String(marketAddress).replace(/,\s*United States\s*$/i, '').trim()}
                                  </p>
                                </div>
                              )}
                              
                              {submission.market_days && submission.market_days.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {submission.market_days.map((day: string) => (
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
            ))}
          </div>
        )}
        
        {/* Product Detail Modal */}
        <ProductDetailModal
          product={selectedProduct}
          products={currentVendorProducts}
          open={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setSelectedProduct(null);
            setCurrentVendorProducts([]);
            setCurrentVendorId(undefined);
            setCurrentVendorName(undefined);
          }}
          onProductChange={setSelectedProduct}
          vendorId={currentVendorId}
          vendorName={currentVendorName}
        />
      </div>
    </div>
  );
};

export default Test3;
