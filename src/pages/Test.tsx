import { Store, MapPin, Clock, Star, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ProductGrid } from "@/components/ProductGrid";

const Test = () => {
  // Sample product data that matches the Product interface
  const sampleProducts = [
    {
      id: 1,
      name: "Organic Tomatoes",
      description: "Fresh, locally grown organic tomatoes perfect for salads and cooking.",
      price: 4.50,
      images: [
        "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=300&fit=crop"
      ]
    },
    {
      id: 2,
      name: "Fresh Carrots",
      description: "Sweet and crunchy carrots harvested daily from our sustainable farm.",
      price: 3.25,
      images: [
        "https://images.unsplash.com/photo-1445282768818-728615cc910a?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=300&fit=crop"
      ]
    },
    {
      id: 3,
      name: "Seasonal Herbs",
      description: "Mixed herbs including basil, parsley, and cilantro grown organically.",
      price: 2.75,
      images: [
        "https://images.unsplash.com/photo-1462536943532-57a629f6cc60?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1515586838455-6483b7b2a6de?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1627664234230-00aaa4b78cb6?w=400&h=300&fit=crop"
      ]
    },
    {
      id: 4,
      name: "Apple Variety Pack",
      description: "A mix of our finest apples including Honeycrisp and Granny Smith.",
      price: 6.00,
      images: [
        "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400&h=300&fit=crop"
      ]
    },
    {
      id: 5,
      name: "Leafy Greens Mix",
      description: "Fresh salad mix with spinach, arugula, and mixed greens.",
      price: 5.50,
      images: [
        "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop"
      ]
    },
    {
      id: 6,
      name: "Bell Peppers",
      description: "Colorful bell peppers in red, yellow, and green varieties.",
      price: 4.00,
      images: [
        "https://images.unsplash.com/photo-1563777249-18556d3a7d5d?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1601001815894-4bb6c81416d2?w=400&h=300&fit=crop"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left column - narrow width */}
      <div className="w-64 bg-card border-r p-6">
        <div className="space-y-6">
          <div>
            <span className="text-foreground text-xl font-bold">mmmmmm</span>
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
            {/* Title row with rating and heart icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold text-foreground">Farm Fresh Produce</h1>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="text-foreground font-medium">4.9</span>
                  <span className="text-muted-foreground">(45 reviews)</span>
                </div>
              </div>
              <Heart className="h-6 w-6 text-muted-foreground" />
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
        <div className="p-8">
          {/* Products Section */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground">Products</h2>
            
            {/* Product Grid */}
            <ProductGrid products={sampleProducts} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test;