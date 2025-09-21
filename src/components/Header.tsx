import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";
import { CartButton } from "@/components/shopping/CartButton";
import { ArrowLeft, Heart, Store, Plus } from "lucide-react";
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
            {user?.email === 'nadiachibri@gmail.com' && (
              <Link to="/submissions" className="ml-6">
                <Button variant={location.pathname === '/submissions' ? "default" : "outline"}>
                  Submissions
                </Button>
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/likes">
              <Button variant="ghost" size="sm">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
            <CartButton />
            {user && (
              <Link to={hasAnySubmission ? "/shop-manager" : "/submit"}>
                <Button variant="ghost" size="sm">
                  {hasAnySubmission ? (
                    <Store className="h-5 w-5" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
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