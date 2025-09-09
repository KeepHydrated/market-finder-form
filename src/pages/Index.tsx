import { useState, useEffect } from "react";
import { MarketSearch } from "@/components/MarketSearch";
import { MarketDetails } from "@/components/MarketDetails";
import { AddMarketForm } from "@/components/AddMarketForm";
import { AddProductForm } from "@/components/AddProductForm";
import { ProductGrid } from "@/components/ProductGrid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VendorApplication } from "@/components/VendorApplication";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowLeft } from "lucide-react";

// Sample data - in a real app, this would come from an API
const sampleMarkets = [
  {
    id: 1,
    name: "Downtown Farmers Market",
    address: "123 Main Street",
    city: "Springfield",
    state: "IL",
    days: ["Wed", "Sat"],
    hours: "8:00 AM - 2:00 PM"
  },
  {
    id: 2,
    name: "Riverside Community Market", 
    address: "456 River Road",
    city: "Madison",
    state: "WI",
    days: ["Thu", "Sun"],
    hours: "9:00 AM - 3:00 PM"
  },
  {
    id: 3,
    name: "Sunset Valley Market",
    address: "789 Valley Ave",
    city: "Portland", 
    state: "OR",
    days: ["Fri", "Sat", "Sun"],
    hours: "7:00 AM - 1:00 PM"
  },
  {
    id: 4,
    name: "Green Hills Market",
    address: "321 Oak Street",
    city: "Austin",
    state: "TX", 
    days: ["Sat"],
    hours: "8:00 AM - 2:00 PM"
  },
  {
    id: 5,
    name: "Valley Fresh Market",
    address: "654 Pine Avenue",
    city: "Denver",
    state: "CO",
    days: ["Wed", "Fri", "Sat"],
    hours: "9:00 AM - 4:00 PM"
  }
];

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string[];
}

const Index = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedMarketName, setSubmittedMarketName] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Load products from localStorage on component mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('farmer-market-products');
    if (savedProducts) {
      try {
        const parsedProducts = JSON.parse(savedProducts);
        setProducts(parsedProducts);
      } catch (error) {
        console.error('Failed to parse saved products:', error);
      }
    }
  }, []);

  // Save products to localStorage whenever products change
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('farmer-market-products', JSON.stringify(products));
    }
  }, [products]);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
  };

  const handleBackToSearch = () => {
    setSelectedMarket(null);
  };

  const handleAddMarket = () => {
    setShowAddForm(true);
  };

  const handleCloseAddForm = () => {
    setShowAddForm(false);
  };

  const handleMarketAdded = (marketName: string) => {
    setSearchTerm(marketName);
    setSubmittedMarketName(marketName);
  };

  const handleAddProduct = () => {
    setShowAddProductForm(true);
  };

  const handleCloseAddProductForm = () => {
    setShowAddProductForm(false);
  };

  const handleProductAdded = async (product: { name: string; description: string; price: number; images: File[] }) => {
    // Convert File objects to base64 strings for persistence
    const imagePromises = product.images.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const imageBase64Array = await Promise.all(imagePromises);

    const newProduct: Product = {
      id: Date.now(), // Simple ID generation
      name: product.name,
      description: product.description,
      price: product.price,
      images: imageBase64Array
    };
    
    setProducts(prev => [...prev, newProduct]);
    setShowAddProductForm(false);
    toast({
      title: "Product Added",
      description: "Your product has been successfully added.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <AuthForm onSuccess={() => {
          toast({
            title: "Welcome!",
            description: "You've successfully signed in.",
          });
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {selectedMarket && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSearch}
                  className="mr-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h1 className="text-2xl font-bold">
                Farmer's Market Hub
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {!selectedMarket && (
                <Button onClick={handleAddMarket}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Market
                </Button>
              )}
              <UserMenu user={user} profile={profile} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <div className="container mx-auto px-4">
          {selectedMarket ? (
            <MarketDetails 
              market={selectedMarket} 
              onBack={handleBackToSearch} 
            />
          ) : (
            <>
              <MarketSearch 
                markets={sampleMarkets}
                onSelectMarket={handleSelectMarket}
                onAddMarket={handleAddMarket}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                submittedMarketName={submittedMarketName}
              />
              
              {/* Vendor Application Form */}
              <Card className="mt-8 p-8 bg-card border-border">
                <VendorApplication />
              </Card>
              
              {/* Products Section */}
              <Card className="mt-8 p-8 bg-card border-border">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-foreground">Products</h2>
                  <Button className="flex items-center gap-2" onClick={handleAddProduct}>
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                </div>
                <ProductGrid products={products} />
              </Card>
            </>
          )}
        </div>
      </main>

      <AddMarketForm 
        open={showAddForm} 
        onClose={handleCloseAddForm}
        onMarketAdded={handleMarketAdded}
      />
      
      <AddProductForm 
        open={showAddProductForm} 
        onClose={handleCloseAddProductForm}
        onProductAdded={handleProductAdded}
      />
    </div>
  );
};

export default Index;
