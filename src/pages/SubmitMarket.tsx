import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AddMarketForm } from "@/components/AddMarketForm";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, MapPin, Calendar, CheckCircle } from "lucide-react";

const SubmitMarket = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(true);

  const handleMarketAdded = (market: any) => {
    toast({
      title: "Market Submitted Successfully!",
      description: "Your farmers market has been submitted for review. We'll notify you once it's approved.",
    });
    setIsFormOpen(false);
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Submit Your Farmers Market
          </h1>
          <p className="text-lg text-muted-foreground">
            Help local shoppers discover your market and connect with vendors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <Store className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Reach More Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect with thousands of local shoppers looking for fresh, locally-sourced products
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MapPin className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Build Your Presence</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Showcase your market's location, hours, and unique vendors in one place
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Easy Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Update your market information, hours, and vendor list anytime
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              What You'll Need
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Market name and complete address</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Operating days and hours</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Basic information about your market</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <AddMarketForm
          open={isFormOpen}
          onClose={handleClose}
          onMarketAdded={handleMarketAdded}
        />
      </div>
    </div>
  );
};

export default SubmitMarket;
