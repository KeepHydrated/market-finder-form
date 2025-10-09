import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/auth/UserMenu";
import { CartButton } from "@/components/shopping/CartButton";
import { ArrowLeft, Heart, Store, ChevronDown, Search, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    const checkAnySubmission = async () => {
      if (!user) {
        setHasAnySubmission(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('id, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setHasAnySubmission(!!data);
      } catch (error) {
        console.error('Error checking submission status:', error);
        setHasAnySubmission(false);
      }
    };

    checkAnySubmission();
  }, [user]);

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
              <h1 className="text-2xl font-bold cursor-pointer">
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
          
          <div className="flex items-center space-x-4 h-16">
            <Link to="/likes">
              <Button variant="ghost" size="sm">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
            <CartButton />
            {user && (
              <Link to="/my-shop">
                <Button variant="ghost" size="sm">
                  <Store className="h-5 w-5" />
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
          
          {/* Second row on md (iPad), hidden on lg+ */}
          <div className="w-full flex items-center space-x-4 pb-3 lg:hidden">
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