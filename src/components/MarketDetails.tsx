import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, ArrowLeft } from "lucide-react";
import { VendorApplicationForm } from "./VendorApplicationForm";

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string;
}

interface MarketDetailsProps {
  market: Market;
  onBack: () => void;
}

export const MarketDetails = ({ market, onBack }: MarketDetailsProps) => {
  const [showVendorForm, setShowVendorForm] = useState(false);

  const handleJoinMarket = () => {
    setShowVendorForm(true);
  };

  const handleCloseVendorForm = () => {
    setShowVendorForm(false);
  };

  return (
    <div className="space-y-6">
      <Button 
        onClick={onBack} 
        variant="outline" 
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Search
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">{market.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-foreground font-medium">{market.address}</p>
              <p className="text-muted-foreground">{market.city}, {market.state}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <p className="text-foreground">{market.hours}</p>
          </div>
          
          <div>
            <h3 className="font-medium text-foreground mb-3">Market Days</h3>
            <div className="flex flex-wrap gap-2">
              {market.days.map((day) => (
                <Badge key={day} variant="secondary" className="px-3 py-1">
                  {day}
                </Badge>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={handleJoinMarket}
              className="w-full bg-success text-success-foreground hover:bg-success/90"
              size="lg"
            >
              Join This Market
            </Button>
          </div>
        </CardContent>
      </Card>

      <VendorApplicationForm 
        open={showVendorForm}
        onClose={handleCloseVendorForm}
        marketName={market.name}
      />
    </div>
  );
};