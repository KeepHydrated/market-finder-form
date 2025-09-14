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
import { useLikes, LikeType } from "@/hooks/useLikes";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TabType = "markets" | "vendors" | "products";

// Map tab types to like types
const tabToLikeType = (tab: TabType): LikeType => {
  switch (tab) {
    case "markets": return "market";
    case "vendors": return "vendor";
    case "products": return "product";
  }
};

const Likes = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("markets");
  const { likes, loading, toggleLike } = useLikes();

  const tabs = [
    { id: "markets" as TabType, title: "Markets", icon: MapPin },
    { id: "vendors" as TabType, title: "Vendors", icon: Store },
    { id: "products" as TabType, title: "Products", icon: Package },
  ];

  const getFilteredLikes = (tabType: TabType) => {
    const likeType = tabToLikeType(tabType);
    return likes.filter(like => like.item_type === likeType);
  };

  const renderLikedItems = (tabType: TabType) => {
    const filteredLikes = getFilteredLikes(tabType);
    const likeType = tabToLikeType(tabType);
    
    if (loading) {
      return (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading your likes...</p>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground">
            Please sign in to view your liked items
          </p>
        </div>
      );
    }

    if (filteredLikes.length === 0) {
      const icons = {
        markets: MapPin,
        vendors: Store,
        products: Package
      };
      const Icon = icons[tabType];
      
      return (
        <div className="text-center py-16">
          <Icon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Liked {tabType.charAt(0).toUpperCase() + tabType.slice(1)}</h2>
          <p className="text-muted-foreground">
            {tabType.charAt(0).toUpperCase() + tabType.slice(1)} you like will appear here
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLikes.map((like) => (
          <Card key={like.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {likeType === 'market' && 'Market'}
                  {likeType === 'vendor' && 'Vendor'}
                  {likeType === 'product' && 'Product'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLike(like.item_id, like.item_type)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                ID: {like.item_id}
              </p>
              <p className="text-xs text-muted-foreground">
                Liked on {new Date(like.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    return renderLikedItems(activeTab);
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