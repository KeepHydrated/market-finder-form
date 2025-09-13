import { Store, MapPin, Clock } from "lucide-react";

const Test = () => {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left column - narrow width */}
      <div className="w-64 bg-card border-r p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-base font-normal">mmmmmm</span>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-muted-foreground text-base font-normal">mmmm</p>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground text-base font-normal">Tuesday, 08:00 AM - 14:00 PM</span>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1">
        {/* Blank main content */}
      </div>
    </div>
  );
};

export default Test;