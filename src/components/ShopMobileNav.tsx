import { NavLink, useLocation } from "react-router-dom";
import { 
  Package, 
  Settings, 
  ShoppingBag,
  TestTube,
  Wrench
} from "lucide-react";

interface ShopMobileNavProps {
  hasShopData?: boolean;
}

const menuItems = [
  { 
    title: "Overview", 
    icon: TestTube, 
    section: "overview",
    requiresShop: false 
  },
  { 
    title: "Setup", 
    icon: Wrench, 
    section: "setup",
    requiresShop: false 
  },
  { 
    title: "Products", 
    icon: Package, 
    section: "products",
    requiresShop: false 
  },
  { 
    title: "Orders", 
    icon: ShoppingBag, 
    section: "orders2",
    requiresShop: true 
  },
  { 
    title: "Account", 
    icon: Settings, 
    section: "account",
    requiresShop: true 
  },
];

export function ShopMobileNav({ hasShopData = false }: ShopMobileNavProps) {
  const location = useLocation();
  
  const urlParams = new URLSearchParams(location.search);
  const currentSection = urlParams.get('section') || 'overview';

  const availableItems = menuItems.filter(item => 
    !item.requiresShop || hasShopData
  );

  const isActive = (section: string) => currentSection === section;

  return (
    <div className="sm:hidden fixed top-16 left-0 right-0 bg-background border-b z-40">
      <div className="flex flex-col gap-2 p-4">
        {availableItems.map((item) => (
          <NavLink
            key={item.section}
            to={`/my-shop?section=${item.section}`}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.section)
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
