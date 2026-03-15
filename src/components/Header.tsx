import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/auth/UserMenu";
import { CartButton } from "@/components/shopping/CartButton";
import { ArrowLeft, Heart, Store, ChevronDown, Search, DollarSign, Home, X } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  user: any;
  profile: any;
  onBackClick?: () => void;
  showBackButton?: boolean;
}

const WidthIndicator = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return <>{width}px</>;
};

export const Header = ({ user, profile, onBackClick, showBackButton }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasAnySubmission, setHasAnySubmission] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const isOnOrdersPage = location.pathname === '/my-shop' && location.search.includes('section=orders2');
  
  // Get current category if on search page
  const searchParams = new URLSearchParams(location.search);
  const currentCategory = location.pathname === '/search' ? (searchParams.get('category') || 'All') : null;
  const currentSearchTerm = searchParams.get('search') || searchParams.get('q');
  
  // Helper function to build category URLs with preserved search term
  const getCategoryUrl = (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (currentSearchTerm) params.set('search', currentSearchTerm);
    return `/search${params.toString() ? `?${params.toString()}` : ''}`;
  };

  useEffect(() => {
    const checkAnySubmission = async () => {
      if (!user) {
        setHasAnySubmission(false);
        setNewOrdersCount(0);
        return;
      }

      try {
        const { data: submission, error } = await supabase
          .from('submissions')
          .select('id, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setHasAnySubmission(!!submission);

        // If there's a submission, check for new orders
        if (submission) {
          // Get the last viewed timestamp from localStorage
          const lastViewedKey = `orders_last_viewed_${submission.id}`;
          const lastViewed = localStorage.getItem(lastViewedKey);
          
          const query = supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('vendor_id', submission.id)
            .eq('status', 'paid');
          
          // Only count orders created after last viewed time
          if (lastViewed) {
            query.gt('created_at', lastViewed);
          }
          
          const { count } = await query;
          setNewOrdersCount(count || 0);
        }
      } catch (error) {
        console.error('Error checking submission status:', error);
        setHasAnySubmission(false);
        setNewOrdersCount(0);
      }
    };

    checkAnySubmission();

    // Clear notification when on orders page
    if (isOnOrdersPage && user) {
      const getSubmissionAndMarkViewed = async () => {
        const { data: submission } = await supabase
          .from('submissions')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (submission) {
          const lastViewedKey = `orders_last_viewed_${submission.id}`;
          localStorage.setItem(lastViewedKey, new Date().toISOString());
          setNewOrdersCount(0);
        }
      };
      getSubmissionAndMarkViewed();
    }

    // Set up realtime subscription for new orders
    if (user) {
      const channel = supabase
        .channel('order-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
          },
          () => {
            // Refresh count when a new order is inserted
            checkAnySubmission();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
          },
          () => {
            // Refresh count when an order status changes
            checkAnySubmission();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isOnOrdersPage]);

  // Sync search query with URL params
  useEffect(() => {
    if (location.pathname === '/') {
      setSearchQuery('');
    } else if (location.pathname === '/search') {
      const urlSearch = searchParams.get('search') || searchParams.get('q') || '';
      setSearchQuery(urlSearch);
    }
  }, [location.pathname, location.search]);

  const clearSearch = () => {
    setSearchQuery('');
    if (location.pathname === '/search') {
      const params = new URLSearchParams(location.search);
      params.delete('search');
      params.delete('q');
      const remaining = params.toString();
      navigate(remaining ? `/search?${remaining}` : '/search');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search page with search query
      const searchUrl = currentCategory 
        ? `/search?search=${encodeURIComponent(searchQuery.trim())}&category=${encodeURIComponent(currentCategory)}`
        : `/search?search=${encodeURIComponent(searchQuery.trim())}`;
      navigate(searchUrl);
    }
  };

  return (
    <header className="bg-card shadow-sm border-b sticky top-0 z-50 relative">
      <div className="absolute top-1 right-1 bg-muted text-muted-foreground text-[10px] font-mono px-1.5 py-0.5 rounded opacity-70 z-[60]">
        <WidthIndicator />
      </div>
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-between items-center lg:h-16">
          {/* First row on all screens */}
          <div className="flex items-center space-x-2 h-16">
            {showBackButton && onBackClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-lg font-bold cursor-pointer hidden md:flex items-center gap-1">
                From Farmers Markets
              </h1>
            </Link>
            
            {/* Category dropdown - hidden on md and on search page, shown on lg+ */}
            {location.pathname !== '/search' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="sm" className="ml-4 hidden lg:flex">
                    {currentCategory || 'Category'}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-background border shadow-lg z-50">
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl()} className="w-full font-semibold">
                      All
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Fresh Flowers & Plants')} className="w-full">
                      Fresh Flowers & Plants
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Bakery')} className="w-full">
                      Bakery
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Dairy')} className="w-full">
                      Dairy
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Rancher')} className="w-full">
                      Rancher
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Beverages')} className="w-full">
                      Beverages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Seasonings & Spices')} className="w-full">
                      Seasonings & Spices
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Pets')} className="w-full">
                      Pets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Home Goods')} className="w-full">
                      Home Goods
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Farmers')} className="w-full">
                      Farmers
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Ready to Eat')} className="w-full">
                      Ready to Eat
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Packaged Goods & Snacks')} className="w-full">
                      Packaged Goods & Snacks
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Artisan')} className="w-full">
                      Artisan
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Desktop search bar - on / and /search */}
          {(location.pathname === '/' || location.pathname === '/search') && (
            <div className="flex-1 max-w-md mx-8 hidden md:block">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search vendors, products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-8 bg-background/50 border-border"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Mobile navigation - centered home icon */}
          <div className="flex items-center justify-between md:justify-end w-full md:w-auto space-x-4 md:space-x-8 h-16">
            {/* Left icons on mobile */}
            <div className="flex items-center space-x-4 md:hidden">
              <Link to="/likes">
                <Button variant="ghost" size="sm">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>
              <CartButton />
            </div>
            
            {/* Center home icon on mobile */}
            <Link to="/" className="md:hidden">
              <Button variant="ghost" size="sm">
                <Home className="h-6 w-6" strokeWidth={2.5} />
              </Button>
            </Link>
            
            {/* Right icons on mobile */}
            <div className="flex items-center space-x-4">
              {/* Desktop likes and cart */}
              <Link to="/likes" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>
              <div className="hidden md:block">
                <CartButton />
              </div>
              
              <Link to="/my-shop?section=overview">
                <Button variant="ghost" size="sm" className="relative">
                  <Store className="h-5 w-5" />
                  {user && newOrdersCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
                    >
                      {newOrdersCount > 9 ? '9+' : newOrdersCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              {user ? (
                <UserMenu user={user} profile={profile} />
              ) : location.pathname === '/vendor-signup' ? (
                <UserMenu 
                  user={{ email: 'sample@example.com' }} 
                  profile={{ full_name: 'Sample Account' }} 
                  isMockUser={true}
                />
              ) : (
                <Link to="/auth">
                  <Button variant="default" size="sm">
                    Log In
                  </Button>
                </Link>
              )}
            </div>
          </div>
          
          {/* Second row on md (iPad), hidden on mobile and lg+ */}
          <div className="w-full hidden md:flex lg:hidden items-center space-x-4 pb-3">
            {location.pathname !== '/search' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="sm">
                    {currentCategory || 'Category'}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-background border shadow-lg z-50">
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl()} className="w-full font-semibold">
                      All
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Fresh Flowers & Plants')} className="w-full">
                      Fresh Flowers & Plants
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Bakery')} className="w-full">
                      Bakery
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Dairy')} className="w-full">
                      Dairy
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Rancher')} className="w-full">
                      Rancher
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Beverages')} className="w-full">
                      Beverages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Seasonings & Spices')} className="w-full">
                      Seasonings & Spices
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Pets')} className="w-full">
                      Pets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Home Goods')} className="w-full">
                      Home Goods
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Farmers')} className="w-full">
                      Farmers
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Ready to Eat')} className="w-full">
                      Ready to Eat
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Packaged Goods & Snacks')} className="w-full">
                      Packaged Goods & Snacks
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to={getCategoryUrl('Artisan')} className="w-full">
                      Artisan
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
          </div>
        </div>

        {/* Mobile search bar - right under header, on / and /search */}
        {(location.pathname === '/' || location.pathname === '/search') && (
          <div className="md:hidden pb-3">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search vendors, products, markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-8 h-11 text-base rounded-full border-border bg-background/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </header>
  );
};