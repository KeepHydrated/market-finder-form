import { useState } from "react";
import { Heart, MapPin, Store, Package } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

type TabType = "markets" | "vendors" | "products";

const Likes = () => {
  const [activeTab, setActiveTab] = useState<TabType>("markets");

  const tabs = [
    { id: "markets" as TabType, title: "Markets", icon: MapPin },
    { id: "vendors" as TabType, title: "Vendors", icon: Store },
    { id: "products" as TabType, title: "Products", icon: Package },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "markets":
        return (
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Liked Markets</h2>
            <p className="text-muted-foreground">
              Markets you've liked will appear here
            </p>
          </div>
        );
      case "vendors":
        return (
          <div className="text-center py-16">
            <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Liked Vendors</h2>
            <p className="text-muted-foreground">
              Vendors you've liked will appear here
            </p>
          </div>
        );
      case "products":
        return (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Liked Products</h2>
            <p className="text-muted-foreground">
              Products you've liked will appear here
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="w-60" collapsible="none">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2 px-4 py-3">
                <Heart className="w-5 h-5" />
                Your Likes
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tabs.map((tab) => (
                    <SidebarMenuItem key={tab.id}>
                      <SidebarMenuButton 
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full justify-start ${
                          activeTab === tab.id 
                            ? "bg-muted text-primary font-medium" 
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <tab.icon className="mr-2 h-4 w-4" />
                        <span>{tab.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1">
          <div className="container mx-auto px-4 py-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Likes;