import { useState } from "react";
import { NavLink, useLocation, useMatch } from "react-router-dom";
import { Menu, X } from "lucide-react";

interface ShopMobileNavProps {
  hasShopData?: boolean;
}

const menuItems = [
  {
    title: "Overview",
    section: "overview",
    requiresShop: true,
  },
  {
    title: "Setup",
    section: "setup",
    requiresShop: false,
  },
  {
    title: "Products",
    section: "products",
    requiresShop: false,
  },
  {
    title: "Orders",
    section: "orders2",
    requiresShop: true,
  },
  {
    title: "Account",
    section: "account",
    requiresShop: true,
  },
];

type DrawerSide = "left" | "right" | null;

export function ShopMobileNav({ hasShopData = false }: ShopMobileNavProps) {
  const location = useLocation();
  const [openSide, setOpenSide] = useState<DrawerSide>(null);

  const isMyShop2 = useMatch("/my-shop2");
  const basePath = isMyShop2 ? "/my-shop2" : "/my-shop";

  const urlParams = new URLSearchParams(location.search);
  const currentSection = urlParams.get("section") || "setup";

  const availableItems = menuItems.filter((item) => !item.requiresShop || hasShopData);
  const isActive = (section: string) => currentSection === section;
  const isOpen = openSide !== null;

  return (
    <>
      <div className="sm:hidden fixed top-16 left-0 right-0 z-40 px-4 py-3 pointer-events-none flex justify-between">
        <button
          type="button"
          onClick={() => setOpenSide("left")}
          className="pointer-events-auto p-2 rounded-md hover:bg-muted"
          aria-label="Open shop menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setOpenSide("right")}
          className="pointer-events-auto p-2 rounded-md hover:bg-muted"
          aria-label="Open shop menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {isOpen && (
        <div className="sm:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenSide(null)}
          />

          <div
            className={`absolute top-0 h-full w-64 bg-background border-border shadow-lg ${
              openSide === "right" ? "right-0 border-l" : "left-0 border-r"
            }`}
          >
            <div className="flex justify-end p-4">
              <button
                type="button"
                onClick={() => setOpenSide(null)}
                className="p-2 rounded-md hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 px-4 pb-4">
              {availableItems.map((item) => (
                <NavLink
                  key={item.section}
                  to={`${basePath}?section=${item.section}`}
                  onClick={() => setOpenSide(null)}
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.section)
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>{item.title}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
