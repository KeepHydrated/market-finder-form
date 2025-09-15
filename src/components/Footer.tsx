import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Want to list your farmers market?
          </h3>
          <Button 
            onClick={() => navigate('/submit')} 
            variant="default"
            size="lg"
            className="font-medium"
          >
            Submit My Farmers Market
          </Button>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Join our community of local farmers markets and help people discover fresh, local produce in your area.
          </p>
        </div>
      </div>
    </footer>
  );
};