import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";
import { CartButton } from "@/components/shopping/CartButton";
import { ArrowLeft, Heart, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  user: any;
  profile: any;
  onBackClick?: () => void;
  showBackButton?: boolean;
}

export const Header = ({ user, profile, onBackClick, showBackButton }: HeaderProps) => {
  const location = useLocation();
  const [hasAcceptedSubmission, setHasAcceptedSubmission] = useState(false);

  useEffect(() => {
    const checkAcceptedSubmission = async () => {
      if (!user) {
        setHasAcceptedSubmission(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'accepted')
          .maybeSingle();

        setHasAcceptedSubmission(!!data);
      } catch (error) {
        console.error('Error checking submission status:', error);
        setHasAcceptedSubmission(false);
      }
    };

    checkAcceptedSubmission();
  }, [user]);

  return (
    <header className="bg-card shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
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
          </div>
          <div className="flex items-center space-x-4">
            {user?.email === 'nadiachibri@gmail.com' && (
              <>
                <Link to="/profile">
                  <Button variant={location.pathname === '/profile' ? "default" : "outline"}>
                    Home
                  </Button>
                </Link>
                <Link to="/submissions">
                  <Button variant={location.pathname === '/submissions' ? "default" : "outline"}>
                    Submissions
                  </Button>
                </Link>
              </>
            )}
            <Link to="/likes">
              <Button variant="ghost" size="sm">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
            {hasAcceptedSubmission && (
              <Link to="/shop-manager">
                <Button variant="ghost" size="sm">
                  <Store className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <CartButton />
            <UserMenu user={user} profile={profile} />
          </div>
        </div>
      </div>
    </header>
  );
};