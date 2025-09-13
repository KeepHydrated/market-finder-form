import { Store, MapPin, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
        {/* Top row under header */}
        <div className="bg-card border-b p-8">
          <div className="grid grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              <p className="text-foreground">hhhh</p>
              <p className="text-foreground">bbbb</p>
            </div>
            
            {/* Right column */}
            <div className="space-y-6">
              <p className="text-foreground">Home Goods</p>
              <p className="text-foreground">bbb</p>
            </div>
          </div>
        </div>
        
        {/* Rest of main content */}
        <div className="p-4">
          {/* Main content area */}
        </div>
      </div>
    </div>
  );
};

export default Test;