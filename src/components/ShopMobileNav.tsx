import { useState } from "react";
import { NavLink, useLocation, useMatch } from "react-router-dom";
import { 
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface ShopMobileNavProps {
  hasShopData?: boolean;
}

const menuItems = [
  { 
    title: "Overview", 
    section: "overview",
    requiresShop: true 
  },
  { 
    title: "Setup", 
    section: "setup",
    requiresShop: false 
  },
  { 
    title: "Products", 
    section: "products",
    requiresShop: false 
  },
  { 
    title: "Orders", 
    section: "orders2",
    requiresShop: true 
  },
  { 
    title: "Account", 
    section: "account",
    requiresShop: true 
  },
];

export function ShopMobileNav({ hasShopData = false }: ShopMobileNavProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  const isMyShop2 = useMatch('/my-shop2');
  const basePath = isMyShop2 ? '/my-shop2' : '/my-shop';
  
  const urlParams = new URLSearchParams(location.search);
  const currentSection = urlParams.get('section') || 'setup';

  const availableItems = menuItems.filter(item => 
    !item.requiresShop || hasShopData
  );

  const isActive = (section: string) => currentSection === section;

  return (
    <>
      {/* Hamburger buttons - fixed position, pointer-events only on buttons */}
      <div className="sm:hidden fixed top-16 left-0 right-0 z-40 px-4 py-3 pointer-events-none flex justify-between">
        <button 
          onClick={() => setOpen(true)}
          className="pointer-events-auto p-2 rounded-md hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button 
          onClick={() => setOpen(true)}
          className="pointer-events-auto p-2 rounded-md hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Sheet rendered outside the fixed container */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64">
          <div className="flex flex-col gap-2 mt-8">
            {availableItems.map((item) => (
              <NavLink
                key={item.section}
                to={`${basePath}?section=${item.section}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.section)
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
