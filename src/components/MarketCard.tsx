import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Star, Heart } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";

interface MarketCardProps {
  id: string;
  name: string;
  address: string;
  days: string[];
  hours: string;
  rating?: number;
  ratingCount?: number;
}

export const MarketCard = ({ id, name, address, days, hours, rating, ratingCount }: MarketCardProps) => {
  const { toggleLike, isLiked } = useLikes();

  const handleLike = () => {
    toggleLike(id, 'market');
  };

  return (
    <Card className="relative hover:shadow-lg transition-shadow overflow-hidden">
      {/* Rating Badge - Top Left */}
      {rating && (
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5">
            <div className="flex gap-0.5">
              {/* Show 1 star on mobile, 5 stars on desktop */}
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star}
                  className={`h-3.5 w-3.5 fill-current ${
                    star <= rating 
                      ? 'text-yellow-400' 
                      : 'text-gray-300'
                  } ${star > 1 ? 'hidden md:block' : ''}`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold">
              {rating.toFixed(1)} {ratingCount && `(${ratingCount})`}
            </span>
          </div>
        </div>
      )}

      {/* Heart Button - Top Right */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-3 right-3 z-10 p-2 h-auto bg-white/90 hover:bg-white rounded-full"
        onClick={handleLike}
      >
        <Heart 
          className={`h-5 w-5 ${
            isLiked(id, 'market') 
              ? 'fill-red-500 text-red-500' 
              : 'text-gray-600'
          }`} 
        />
      </Button>

      <CardHeader className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground text-left">{name}</h3>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-sm text-muted-foreground">{address}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {days.map((day) => (
            <Badge 
              key={day} 
              className="text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-100 border-0"
            >
              {day}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};