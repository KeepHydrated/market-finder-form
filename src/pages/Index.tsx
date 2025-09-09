import { useState } from "react";
import { MarketSearch } from "@/components/MarketSearch";
import { MarketDetails } from "@/components/MarketDetails";
import { AddMarketForm } from "@/components/AddMarketForm";
import { AddProductForm } from "@/components/AddProductForm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VendorApplication } from "@/components/VendorApplication";
import { Plus } from "lucide-react";

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

const Index = () => {
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedMarketName, setSubmittedMarketName] = useState<string | null>(null);

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

  const handleProductAdded = (productName: string) => {
    console.log('Product added:', productName);
  };

  return (
    <div className="min-h-screen bg-background">
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
                <div className="min-h-[100px] flex items-center justify-center text-muted-foreground">
                  {/* Products will be displayed here */}
                </div>
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
