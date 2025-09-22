import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";
import { CartButton } from "@/components/shopping/CartButton";
import { ArrowLeft, Heart, Store, ChevronDown } from "lucide-react";
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
  const [hasAnySubmission, setHasAnySubmission] = useState(false);

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

  return (
    <header className="bg-card shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
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
                Farmer's Market Hub
              </h1>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="sm" className="ml-4">
                  Category
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background border shadow-lg z-50">
                <DropdownMenuItem>
                  <Link to="/homepage?category=Fresh Flowers & Plants" className="w-full">
                    Fresh Flowers & Plants
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Bakery" className="w-full">
                    Bakery
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Dairy" className="w-full">
                    Dairy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Rancher" className="w-full">
                    Rancher
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Beverages" className="w-full">
                    Beverages
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Seasonings & Spices" className="w-full">
                    Seasonings & Spices
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Pets" className="w-full">
                    Pets
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Home Goods" className="w-full">
                    Home Goods
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Farmers" className="w-full">
                    Farmers
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Ready to Eat" className="w-full">
                    Ready to Eat
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Packaged Goods & Snacks" className="w-full">
                    Packaged Goods & Snacks
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/homepage?category=Artisan" className="w-full">
                    Artisan
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/likes">
              <Button variant="ghost" size="sm">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
            <CartButton />
            {user && (
              <Link to="/submit">
                <Button variant="ghost" size="sm">
                  <Store className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <UserMenu user={user} profile={profile} />
          </div>
        </div>
      </div>
    </header>
  );
};