import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Package, Settings, MessageSquare, Shield, User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdmin } from '@/hooks/useAdmin';

interface UserMenuProps {
  user: any;
  profile?: any;
  isMockUser?: boolean;
}

export function UserMenu({ user, profile, isMockUser = false }: UserMenuProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { isAdmin } = useAdmin();
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSheetOpen(false);
  };

  const handleProfileClick = () => {
    navigate('/account');
    setSheetOpen(false);
  };

  const handleOrdersClick = () => {
    navigate('/orders');
    setSheetOpen(false);
  };

  const handleAccountClick = () => {
    navigate('/account');
    setSheetOpen(false);
  };

  const handleMessagesClick = () => {
    navigate('/messages');
    setSheetOpen(false);
  };

  const getInitials = (name?: string) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Don't render the menu if user is null
  if (!user) {
    return null;
  }

  // Mock user renders differently - just show avatar with login option
  if (isMockUser) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10 border-2 border-dashed border-amber-500">
              <AvatarFallback className="bg-amber-100 text-amber-700">NT</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Demo
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal p-2">
            <div className="cursor-default">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8 border-2 border-dashed border-amber-500">
                  <AvatarFallback className="text-xs bg-amber-100 text-amber-700">NT</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-none">
                    Sample Account
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Preview mode
                  </p>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/auth')}>
            <User className="mr-2 h-4 w-4" />
            <span>Log in to save your store</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Mobile version - Sheet sidebar
  if (isMobile) {
    return (
      <>
        <Button 
          variant="ghost" 
          className="relative h-10 w-10 rounded-full"
          onClick={() => setSheetOpen(true)}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url} alt="Avatar" />
            <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
          </Avatar>
        </Button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle className="sr-only">User Menu</SheetTitle>
            </SheetHeader>
            
            <div className="flex flex-col h-full">
              {/* Profile Section */}
              <div className="w-full p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile?.avatar_url} alt="Avatar" />
                    <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-base font-medium leading-none">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-sm leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="flex-1 space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base h-12"
                  onClick={handleAccountClick}
                >
                  <User className="mr-3 h-5 w-5" />
                  <span>Profile</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base h-12"
                  onClick={handleOrdersClick}
                >
                  <Package className="mr-3 h-5 w-5" />
                  <span>My Orders</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base h-12"
                  onClick={handleMessagesClick}
                >
                  <MessageSquare className="mr-3 h-5 w-5" />
                  <span>Messages</span>
                </Button>

                <Separator className="my-2" />
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base h-12"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  <span>Log out</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop version - Dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url} alt="Avatar" />
            <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-2">
          <div className="cursor-default">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url} alt="Avatar" />
                <AvatarFallback className="text-xs">{getInitials(profile?.full_name)}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || 'User'}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAccountClick}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOrdersClick}>
          <Package className="mr-2 h-4 w-4" />
          <span>My Orders</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleMessagesClick}>
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Messages</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}