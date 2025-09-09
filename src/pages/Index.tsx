import { useState } from "react";
import { Search, Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MarketCard } from "@/components/MarketCard";
import { AddMarketForm } from "@/components/AddMarketForm";

// Sample data - in a real app, this would come from an API
const sampleMarkets = [
  {
    id: 1,
    name: "Downtown Farmers Market",
    address: "123 Main Street, Portland, OR 97205",
    days: ["Wed", "Sat"],
    hours: "8:00 AM - 2:00 PM"
  },
  {
    id: 2,
    name: "Riverside Community Market", 
    address: "456 River Road, Seattle, WA 98101",
    days: ["Thu", "Sun"],
    hours: "9:00 AM - 3:00 PM"
  },
  {
    id: 3,
    name: "Green Valley Market",
    address: "789 Valley Ave, San Francisco, CA 94102", 
    days: ["Fri", "Sat", "Sun"],
    hours: "7:00 AM - 1:00 PM"
  }
];

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredMarkets = sampleMarkets.filter(market =>
    market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-2">
            Find Local Farmers Markets
          </h1>
          <p className="text-center text-primary-foreground/90 text-lg">
            Discover fresh, local produce in your community
          </p>
        </div>
      </header>

      {/* Search Section */}
      <section className="py-8 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by market name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
          
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Don't see your local farmers market?
            </p>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-success text-success-foreground hover:bg-success/90"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Your Market
            </Button>
          </div>
        </div>
      </section>

      {/* Markets Grid */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {filteredMarkets.length === 0 ? (
            <Card className="max-w-md mx-auto">
              <CardContent className="flex flex-col items-center py-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No markets found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? `No markets match "${searchTerm}"`
                    : "No markets available"
                  }
                </p>
                <Button 
                  onClick={() => setShowAddForm(true)}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add a Market
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  name={market.name}
                  address={market.address}
                  days={market.days}
                  hours={market.hours}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <AddMarketForm 
        open={showAddForm} 
        onClose={() => setShowAddForm(false)} 
      />
    </div>
  );
};

export default Index;
