import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/auth/UserMenu";
import { CartButton } from "@/components/shopping/CartButton";
import { ArrowLeft, Heart, Store, ChevronDown, Search, DollarSign, Home } from "lucide-react";
import { useEffect, useState } from "react";
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

export const Header = ({ user, profile, onBackClick, showBackButton }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasAnySubmission, setHasAnySubmission] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const isOnOrdersPage = location.pathname === '/my-shop' && location.search.includes('section=orders2');

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/homepage?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-card shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-between items-center lg:h-16">
          {/* First row on all screens */}
          <div className="flex items-center space-x-4 h-16">
            {showBackButton && onBackClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Link to="/homepage" className="hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold cursor-pointer hidden md:block">
                My Local Farmers Markets
              </h1>
            </Link>
            {/* Category dropdown - hidden on md, shown on lg+ */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="sm" className="ml-4 hidden lg:flex">
                  Category
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background border shadow-lg z-50">
                <DropdownMenuItem>
                  <Link to="/category" className="w-full font-semibold">
                    All
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Fresh Flowers & Plants" className="w-full">
                    Fresh Flowers & Plants
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Bakery" className="w-full">
                    Bakery
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Dairy" className="w-full">
                    Dairy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Rancher" className="w-full">
                    Rancher
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Beverages" className="w-full">
                    Beverages
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Seasonings & Spices" className="w-full">
                    Seasonings & Spices
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Pets" className="w-full">
                    Pets
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Home Goods" className="w-full">
                    Home Goods
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Farmers" className="w-full">
                    Farmers
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Ready to Eat" className="w-full">
                    Ready to Eat
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Packaged Goods & Snacks" className="w-full">
                    Packaged Goods & Snacks
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Artisan" className="w-full">
                    Artisan
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Search bar - hidden on md, shown on lg+ in first row */}
          <div className="flex-1 max-w-md mx-8 hidden lg:block">
            <form onSubmit={handleSearch} className="relative">
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
          
          <div className="flex items-center justify-center space-x-4 md:space-x-8 h-16">
            <Link to="/likes">
              <Button variant="ghost" size="sm">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
            <CartButton />
            <Link to="/homepage" className="md:hidden">
              <Button variant="ghost" size="sm">
                <Home className="h-6 w-6" strokeWidth={2.5} />
              </Button>
            </Link>
            {user && (
              <Link to="/my-shop?section=overview">
                <Button variant="ghost" size="sm" className="relative">
                  <Store className="h-5 w-5" />
                  {newOrdersCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
                    >
                      {newOrdersCount > 9 ? '9+' : newOrdersCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}
            {user ? (
              <UserMenu user={user} profile={profile} />
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm">
                  Log In
                </Button>
              </Link>
            )}
          </div>
          
          {/* Second row on md (iPad), hidden on mobile and lg+ */}
          <div className="w-full hidden md:flex lg:hidden items-center space-x-4 pb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="sm">
                  Category
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background border shadow-lg z-50">
                <DropdownMenuItem>
                  <Link to="/category" className="w-full font-semibold">
                    All
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Fresh Flowers & Plants" className="w-full">
                    Fresh Flowers & Plants
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Bakery" className="w-full">
                    Bakery
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Dairy" className="w-full">
                    Dairy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Rancher" className="w-full">
                    Rancher
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Beverages" className="w-full">
                    Beverages
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Seasonings & Spices" className="w-full">
                    Seasonings & Spices
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Pets" className="w-full">
                    Pets
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Home Goods" className="w-full">
                    Home Goods
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Farmers" className="w-full">
                    Farmers
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Ready to Eat" className="w-full">
                    Ready to Eat
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Packaged Goods & Snacks" className="w-full">
                    Packaged Goods & Snacks
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/category?category=Artisan" className="w-full">
                    Artisan
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex-1 max-w-md">
              <form onSubmit={handleSearch} className="relative">
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
          </div>
        </div>
      </div>
    </header>
  );
};