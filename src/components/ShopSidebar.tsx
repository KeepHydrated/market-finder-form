import { useState } from "react";
import { 
  Package, 
  Store, 
  Settings, 
  ShoppingBag,
  TestTube
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface ShopSidebarProps {
  hasShopData?: boolean;
}

const menuItems = [
  { 
    title: "Products", 
    icon: Package, 
    section: "products",
    requiresShop: false 
  },
  { 
    title: "Orders", 
    icon: ShoppingBag, 
    section: "orders",
    requiresShop: true 
  },
  { 
    title: "Account", 
    icon: Settings, 
    section: "account",
    requiresShop: true 
  },
  { 
    title: "Overview", 
    icon: TestTube, 
    section: "overview",
    requiresShop: false 
  },
];

export function ShopSidebar({ hasShopData = false }: ShopSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  
  // Get current section from URL params or default
  const urlParams = new URLSearchParams(location.search);
  const currentSection = urlParams.get('section') || 'products';

  // Filter items based on whether shop data exists
  const availableItems = menuItems.filter(item => 
    !item.requiresShop || hasShopData
  );

  const isActive = (section: string) => currentSection === section;

  const getNavClasses = (active: boolean, section: string) =>
    active 
      ? "bg-primary text-primary-foreground font-medium"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar
      collapsible="icon"
    >
      {/* Header spacer to align with main content header */}
      <div className="h-16 border-b flex items-center px-4">
        <span className="font-semibold text-sm text-muted-foreground">Navigation</span>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {availableItems.map((item) => (
                <SidebarMenuItem key={item.section}>
                  <SidebarMenuButton asChild className={getNavClasses(isActive(item.section), item.section)}>
                    <NavLink 
                      to={`/submit?section=${item.section}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}