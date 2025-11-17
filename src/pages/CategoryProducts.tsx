import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, Star, ArrowLeft, ShoppingCart, ChevronDown, Check, Search, MapPin, Globe, Filter, X, Store, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLikes } from "@/hooks/useLikes";
import { useShoppingCart } from "@/contexts/ShoppingCartContext";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { getCoordinatesForAddress, calculateDistance } from "@/lib/geocoding";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [locationScope, setLocationScope] = useState<'local' | 'nationwide'>('nationwide');
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [viewMode, setViewMode] = useState<'vendors' | 'markets' | 'products'>('products');
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const category = searchParams.get('category');
  const searchTerm = searchParams.get('search') || searchParams.get('q');

  const SPECIALTY_CATEGORIES = [
    "Fresh Flowers & Plants",
    "Bakery", 
    "Dairy",
    "Rancher",
    "Beverages",
    "Seasonings & Spices",
    "Pets",
    "Home Goods",
    "Farmers",
    "Ready to Eat",
    "Packaged Goods & Snacks",
    "Artisan"
  ];

  // Initialize search query from URL
  useEffect(() => {
    setSearchQuery(searchTerm || "");
  }, [searchTerm]);

  // Get user location when switching to local mode
  useEffect(() => {
    if (locationScope === 'local' && !userCoordinates) {
      getUserLocation();
    }
  }, [locationScope]);

  const getUserLocation = async () => {
    setIsLoadingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoordinates({ lat: latitude, lng: longitude });
          setIsLoadingLocation(false);
        },
        async (error) => {
          console.warn('GPS location failed, using IP location:', error);
          try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            setUserCoordinates({ lat: data.latitude, lng: data.longitude });
          } catch (err) {
            console.error('Failed to get location:', err);
            toast({
              title: "Location unavailable",
              description: "Using nationwide results instead.",
              variant: "destructive"
            });
            setLocationScope('nationwide');
          }
          setIsLoadingLocation(false);
        }
      );
    } else {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        setUserCoordinates({ lat: data.latitude, lng: data.longitude });
      } catch (err) {
        console.error('Failed to get location:', err);
        toast({
          title: "Location unavailable",
          description: "Using nationwide results instead.",
          variant: "destructive"
        });
        setLocationScope('nationwide');
      }
      setIsLoadingLocation(false);
    }
  };

  // Scroll to top when search results are loaded
  useEffect(() => {
    if (!loading && searchTerm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [loading, searchTerm]);

  // Fetch all vendors nationwide for the selected category (or all categories)
  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      
      try {
        let dbQuery = supabase
          .from('submissions')
          .select('*')
          .eq('status', 'accepted');
        
        // Only filter by category if one is specified
        if (category) {
          dbQuery = dbQuery.eq('primary_specialty', category);
        }

        const { data, error } = await dbQuery;

        if (error) throw error;

        // Get current user email
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email;
        
        // Filter out "test store bb" unless user is nadiachibri@gmail.com
        const filteredData = (data || []).filter(vendor => {
          if (vendor.store_name?.toLowerCase() === 'test store bb') {
            return userEmail === 'nadiachibri@gmail.com';
          }
          return true;
        });

        const logMessage = category 
          ? `Found ${filteredData.length} vendors nationwide for category: ${category}`
          : `Found ${filteredData.length} vendors nationwide (all categories)`;
        
        if (searchTerm) {
          console.log(`${logMessage}, searching for: "${searchTerm}"`);
        } else {
          console.log(logMessage);
        }
        
        setVendors(filteredData);
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

    fetchVendors();
  }, [category, searchTerm, toast]);

  // Get all products from all vendors with location filtering
  const locationFilteredVendors = vendors.filter(vendor => {
    if (locationScope === 'nationwide' || !userCoordinates) {
      return true;
    }
    
    // Filter by distance for local scope (within 50 miles)
    if (vendor.latitude && vendor.longitude) {
      const distance = calculateDistance(
        userCoordinates.lat,
        userCoordinates.lng,
        vendor.latitude,
        vendor.longitude
      );
      return distance <= 50;
    }
    
    return false;
  });

  const allProducts = locationFilteredVendors.flatMap(vendor => {
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
        vendorCreatedAt: vendor.created_at,
        vendorSpecialty: vendor.primary_specialty
      }));
  });

  // Extract unique markets from locationFilteredVendors
  const uniqueMarkets = locationFilteredVendors.reduce((acc, vendor) => {
    const markets = Array.isArray(vendor.selected_markets) 
      ? vendor.selected_markets 
      : typeof vendor.selected_markets === 'string'
      ? JSON.parse(vendor.selected_markets)
      : vendor.selected_market 
      ? [{ name: vendor.selected_market, address: vendor.market_address }]
      : [];
    
    markets.forEach((market: any) => {
      const marketName = typeof market === 'string' ? market : market.name;
      if (marketName && !acc.find((m: any) => m.name === marketName)) {
        acc.push({
          name: marketName,
          address: typeof market === 'string' ? vendor.market_address : market.address,
          vendorCount: 1
        });
      } else if (marketName) {
        const existing = acc.find((m: any) => m.name === marketName);
        if (existing) existing.vendorCount++;
      }
    });
    
    return acc;
  }, [] as any[]);

  // Get current result count based on view mode
  const getResultCount = () => {
    switch (viewMode) {
      case 'vendors':
        return locationFilteredVendors.length;
      case 'markets':
        return uniqueMarkets.length;
      case 'products':
      default:
        return filteredProducts.length;
    }
  };

  // Filter by search term and additional filters
  const searchFilteredProducts = searchTerm
    ? allProducts.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.vendorName.toLowerCase().includes(searchLower)
        );
      })
    : allProducts;

  // Apply additional filters
  const filteredProducts = searchFilteredProducts.filter(product => {
    // Price filter
    if (product.price < priceRange[0] || product.price > priceRange[1]) {
      return false;
    }
    
    // Rating filter
    if (product.vendorRating < minRating) {
      return false;
    }
    
    // Specialty filter
    if (selectedSpecialties.length > 0 && !selectedSpecialties.includes(product.vendorSpecialty)) {
      return false;
    }
    
    return true;
  });

  // Sort products based on selected option
  const sortedProducts = [...filteredProducts].sort((a, b) => {
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
        // Default to newest first (most recent)
        return new Date(b.vendorCreatedAt).getTime() - new Date(a.vendorCreatedAt).getTime();
    }
  });

  console.log('🔍 SORTED PRODUCTS ORDER:', sortedProducts.map(p => p.name));
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
    toggleLike(`${vendorId}-${productId}`, 'product');
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
      {/* Mobile Category and Search - Fixed at bottom on mobile */}
      <div className="w-full flex md:hidden items-center space-x-2 px-4 py-3 fixed bottom-0 left-0 right-0 bg-background z-40 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
             <Button variant="ghost" size="sm" className="max-w-[160px]">
              <span className="truncate">{category || 'All'}</span>
              <ChevronDown className="h-4 w-4 ml-1 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-background border shadow-lg z-50">
            <DropdownMenuItem>
              <Link to={`/search${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full font-semibold">
                All
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Fresh Flowers & Plants${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Fresh Flowers & Plants
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Bakery${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Bakery
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Dairy${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Dairy
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Rancher${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Rancher
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Beverages${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Beverages
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Seasonings & Spices${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Seasonings & Spices
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Pets${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Pets
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Home Goods${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Home Goods
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Farmers${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Farmers
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Ready to Eat${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Ready to Eat
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Packaged Goods & Snacks${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Packaged Goods & Snacks
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={`/search?category=Artisan${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`} className="w-full">
                Artisan
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const currentCategory = searchParams.get('category');
          if (searchQuery.trim()) {
            navigate(`/search?${currentCategory ? `category=${encodeURIComponent(currentCategory)}&` : ''}search=${encodeURIComponent(searchQuery.trim())}`);
          } else {
            // Allow empty search - just navigate to category or all
            navigate(`/search${currentCategory ? `?category=${encodeURIComponent(currentCategory)}` : ''}`);
          }
        }} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search vendors, products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50 border-border"
          />
        </form>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header with View Mode Tabs */}
        <div className="flex flex-col gap-4 mb-8">
          {/* View Mode Toggle Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex rounded-lg bg-muted p-1">
              <button
                onClick={() => setViewMode('vendors')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  viewMode === 'vendors'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Store className="h-5 w-5 md:hidden" />
                <span className="hidden md:inline">Vendors</span>
              </button>
              <button
                onClick={() => setViewMode('markets')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  viewMode === 'markets'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MapPin className="h-5 w-5 md:hidden" />
                <span className="hidden md:inline">Markets</span>
              </button>
              <button
                onClick={() => setViewMode('products')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  viewMode === 'products'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Package className="h-5 w-5 md:hidden" />
                <span className="hidden md:inline">Products</span>
              </button>
            </div>
            
            {/* Filter and Sort Controls */}
            <div className="flex items-center gap-2">
              {/* Filter Button */}
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="bg-[#FFF9E6] hover:bg-[#FFF4D4] border-[#FFE9A0] text-foreground px-4 py-2">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter search results
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filter Results</SheetTitle>
                  </SheetHeader>
                  
                  <div className="space-y-6 mt-6">
                    {/* Price Range Filter */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Price Range</Label>
                      <div className="space-y-2">
                        <Slider
                          value={priceRange}
                          onValueChange={setPriceRange}
                          max={1000}
                          step={10}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>${priceRange[0]}</span>
                          <span>${priceRange[1]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Minimum Rating Filter */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Minimum Rating</Label>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setMinRating(rating)}
                            className={`flex items-center gap-1 px-3 py-2 rounded-md border transition-colors ${
                              minRating === rating
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-muted border-border'
                            }`}
                          >
                            <Star className="h-3 w-3" />
                            <span className="text-sm">{rating}+</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Specialty Categories Filter */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Categories</Label>
                      <div className="space-y-2">
                        {SPECIALTY_CATEGORIES.map((specialty) => (
                          <div key={specialty} className="flex items-center space-x-2">
                            <Checkbox
                              id={specialty}
                              checked={selectedSpecialties.includes(specialty)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSpecialties([...selectedSpecialties, specialty]);
                                } else {
                                  setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
                                }
                              }}
                            />
                            <label
                              htmlFor={specialty}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {specialty}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setPriceRange([0, 1000]);
                        setMinRating(0);
                        setSelectedSpecialties([]);
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="md:min-w-[180px] justify-between md:justify-between px-2 md:px-4 py-2">
                    <span className="hidden md:inline">Sort by: {sortOptions.find(opt => opt.value === sortBy)?.label}</span>
                    <ChevronDown className="h-4 w-4 md:ml-2" />
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
          </div>

          {/* Location Scope Toggle */}
          <div>
            <div className="flex rounded-lg bg-muted p-1 w-fit">
              <button
                onClick={() => setLocationScope('local')}
                disabled={isLoadingLocation}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  locationScope === 'local'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapPin className="h-4 w-4" />
                <span>Local</span>
              </button>
              <button
                onClick={() => setLocationScope('nationwide')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  locationScope === 'nationwide'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Nationwide</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid - conditional based on view mode */}
        {viewMode === 'products' && sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              {searchTerm 
                ? `No products found for "${searchTerm}"${category ? ` in ${category}` : ''}`
                : `No products available for purchase${category ? ` in ${category}` : ''} yet.`
              }
            </p>
            <Button onClick={() => navigate('/')}>
              Browse All Products
            </Button>
          </div>
        ) : viewMode === 'vendors' && locationFilteredVendors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No vendors found{category ? ` in ${category}` : ''}.
            </p>
            <Button onClick={() => navigate('/')}>
              Browse All Vendors
            </Button>
          </div>
        ) : viewMode === 'markets' && uniqueMarkets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No markets found{category ? ` with ${category} vendors` : ''}.
            </p>
            <Button onClick={() => navigate('/')}>
              Browse All Markets
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {viewMode === 'products' && sortedProducts.map((product) => (
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
                          isLiked(`${product.vendorId}-${product.id}`, 'product') 
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
                          navigate(`/market?id=${product.vendorId}`);
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

            {viewMode === 'vendors' && locationFilteredVendors.map((vendor) => (
              <Card key={vendor.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden bg-card border-0 shadow-sm rounded-lg cursor-pointer"
                onClick={() => navigate(`/market?id=${vendor.id}`)}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg text-foreground">{vendor.store_name}</h3>
                    {vendor.primary_specialty && (
                      <Badge variant="secondary" className="text-xs">{vendor.primary_specialty}</Badge>
                    )}
                    {vendor.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{vendor.description}</p>
                    )}
                    {vendor.google_rating && vendor.google_rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{vendor.google_rating.toFixed(1)}</span>
                        {vendor.google_rating_count && (
                          <span className="text-xs text-muted-foreground">({vendor.google_rating_count})</span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {viewMode === 'markets' && uniqueMarkets.map((market, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 overflow-hidden bg-card border-0 shadow-sm rounded-lg cursor-pointer"
                onClick={() => navigate(`/market/${encodeURIComponent(market.name)}`)}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg text-foreground">{market.name}</h3>
                    {market.address && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{market.address}</span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {market.vendorCount} vendor{market.vendorCount !== 1 ? 's' : ''}
                    </p>
                  </div>
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
          products={(() => {
            const mappedProducts = sortedProducts.map(p => ({
              id: p.id,
              name: p.name,
              price: p.price,
              images: p.images,
              description: p.description,
              vendorId: p.vendorId,
              vendorName: p.vendorName
            }));
            console.log('📦 Products passed to modal:', mappedProducts.map(p => p.name));
            return mappedProducts;
          })()}
          open={true}
          onClose={() => setSelectedProduct(null)}
          onProductChange={(product) => {
            const fullProduct = sortedProducts.find(p => p.id === product.id);
            if (fullProduct) {
              console.log('CategoryProducts: Updating to product:', fullProduct);
              setSelectedProduct(fullProduct);
            }
          }}
          vendorId={selectedProduct.vendorId}
          vendorName={selectedProduct.vendorName}
        />
      )}
    </div>
  );
};

export default CategoryProducts;