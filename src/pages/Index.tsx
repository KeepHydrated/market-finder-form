import { useState } from "react";
import { MarketSearch } from "@/components/MarketSearch";
import { MarketDetails } from "@/components/MarketDetails";
import { AddMarketForm } from "@/components/AddMarketForm";
import { Card } from "@/components/ui/card";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="py-12">
        <div className="container mx-auto px-4">
          {/* Blank Box */}
          <Card className="mb-8 p-8 min-h-[200px] bg-card border-border">
            {/* This is a blank box */}
          </Card>

          {selectedMarket ? (
            <MarketDetails 
              market={selectedMarket} 
              onBack={handleBackToSearch} 
            />
          ) : (
            <MarketSearch 
              markets={sampleMarkets}
              onSelectMarket={handleSelectMarket}
              onAddMarket={handleAddMarket}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              submittedMarketName={submittedMarketName}
            />
          )}
        </div>
      </main>

      <AddMarketForm 
        open={showAddForm} 
        onClose={handleCloseAddForm}
        onMarketAdded={handleMarketAdded}
      />
    </div>
  );
};

export default Index;
