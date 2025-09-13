import { Store, MapPin, Clock, Star, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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
          <div className="space-y-4">
            {/* Title row with heart icon */}
            <div className="flex items-start justify-between">
              <h1 className="text-4xl font-bold text-foreground">Farm Fresh Produce</h1>
              <Heart className="h-6 w-6 text-muted-foreground" />
            </div>
            
            {/* Rating row */}
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <span className="text-foreground font-medium">4.9</span>
              <span className="text-muted-foreground">(45 reviews)</span>
            </div>
            
            {/* Category badges */}
            <div className="flex gap-2">
              <Badge variant="secondary">Organic Vegetables</Badge>
              <Badge variant="secondary">Seasonal Fruits</Badge>
              <Badge variant="secondary">Herbs</Badge>
            </div>
            
            {/* Description */}
            <p className="text-muted-foreground">
              Family-owned farm providing fresh, organic vegetables and fruits grown with sustainable practices.
            </p>
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