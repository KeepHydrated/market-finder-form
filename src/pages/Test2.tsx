import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Test2 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Farmers Market Banner */}
        <div className="mb-8 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Submit Your Farmers Market for More Exposure
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Get your market in front of thousands of local shoppers and help your community discover fresh, local products
              </p>
            </div>
            <Button 
              size="lg"
              onClick={() => navigate('/submit-market')}
              className="whitespace-nowrap"
            >
              Submit Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test2;
