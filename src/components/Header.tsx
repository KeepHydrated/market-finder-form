import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";
import { ArrowLeft } from "lucide-react";

interface HeaderProps {
  user: any;
  profile: any;
  onBackClick?: () => void;
  showBackButton?: boolean;
}

export const Header = ({ user, profile, onBackClick, showBackButton }: HeaderProps) => {
  const location = useLocation();

  return (
    <header className="bg-card shadow-sm border-b">
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
            <UserMenu user={user} profile={profile} />
          </div>
        </div>
      </div>
    </header>
  );
};