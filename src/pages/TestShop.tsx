import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Plus } from "lucide-react";
import { ShopSidebar } from "@/components/ShopSidebar";
import { ShopMobileNav } from "@/components/ShopMobileNav";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProductGrid } from "@/components/ProductGrid";
import { AddProductForm } from "@/components/AddProductForm";

const SPECIALTY_CATEGORIES = [
  "Fresh Flowers & Plants",
  "Bakery", 
  "Dairy",
  "Rancher",
  "Beverages",
  "Seasonings & Spices",
  "Pets",
  "Home Goods",
  "Farmers",
  "Ready to Eat",
  "Packaged Goods & Snacks",
  "Artisan"
];

// Pre-filled market data
const prefilledMarket = {
  name: "Saddle Brook Farmers Market",
  address: "123 Main St, Saddle Brook, NJ 07663",
  place_id: "test-market-1"
};

export default function TestShop() {
  const [formData, setFormData] = useState({
    store_name: "",
    primary_specialty: "",
    description: ""
  });

  const [products, setProducts] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedMarkets, setSelectedMarkets] = useState([prefilledMarket]);

  const handleRemoveMarket = (placeId: string) => {
    setSelectedMarkets(selectedMarkets.filter(m => m.place_id !== placeId));
  };

  const handleAddProduct = (product: any) => {
    const newProduct = { ...product, id: Date.now() };
    setProducts([...products, newProduct]);
    setShowAddProduct(false);
  };

  const handleDeleteProduct = (productId: number) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  const handleDuplicateProduct = (product: any) => {
    const duplicated = { ...product, id: Date.now() };
    setProducts([duplicated, ...products]);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background w-full">
        <ShopMobileNav />
        
        <div className="flex w-full">
          <ShopSidebar hasShopData={false} />
        
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Market Search Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Your Farmers Markets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Selected Markets ({selectedMarkets.length}/3)</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMarkets.map((market) => (
                      <Badge
                        key={market.place_id}
                        variant="secondary"
                        className="px-3 py-2 text-sm flex items-center gap-2 bg-primary/10 text-primary border-primary/20"
                      >
                        <MapPin className="h-3 w-3" />
                        {market.name}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => handleRemoveMarket(market.place_id)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Store Details */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Store Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store_name">
                    Store Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="store_name"
                    placeholder="Enter your store name"
                    value={formData.store_name}
                    onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary_specialty">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.primary_specialty}
                    onValueChange={(value) => setFormData({ ...formData, primary_specialty: value })}
                  >
                    <SelectTrigger id="primary_specialty">
                      <SelectValue placeholder="Select a specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTY_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us about your shop..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Products Section */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Products</CardTitle>
                  <Button onClick={() => setShowAddProduct(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No products added yet.</p>
                    <p className="text-sm">Add your first product to get started.</p>
                  </div>
                ) : (
                  <ProductGrid
                    products={products}
                    onDeleteProduct={handleDeleteProduct}
                    onDuplicateProduct={handleDuplicateProduct}
                  />
                )}
              </CardContent>
            </Card>

            {/* Continue Button */}
            <div className="flex justify-center">
              <Button size="lg" className="px-12">
                Continue to Products
                <span className="ml-2">→</span>
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Add Product Modal */}
      <AddProductForm
        open={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onProductAdded={handleAddProduct}
      />
      </div>
    </SidebarProvider>
  );
}
