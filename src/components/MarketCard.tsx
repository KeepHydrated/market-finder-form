import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";

interface MarketCardProps {
  name: string;
  address: string;
  days: string[];
  hours: string;
}

export const MarketCard = ({ name, address, days, hours }: MarketCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg text-foreground">{name}</CardTitle>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-foreground mt-0.5" />
          <p className="text-sm text-foreground">{address}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-foreground" />
          <p className="text-sm text-foreground">{hours}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {days.map((day) => (
            <Badge key={day} variant="secondary" className="text-xs">
              {day}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};