import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const VendorApplication = () => {
  const [storeName, setStoreName] = useState("");
  const [primarySpecialty, setPrimarySpecialty] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  const specialties = [
    "Fresh Produce",
    "Organic Vegetables",
    "Artisan Breads",
    "Local Honey",
    "Dairy Products",
    "Handmade Crafts",
    "Prepared Foods",
    "Flowers & Plants",
    "Meat & Poultry",
    "Other"
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="store-name" className="text-sm font-medium">
          Store Name *
        </Label>
        <Input
          id="store-name"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="e.g., Fresh Produce Stand"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="primary-specialty" className="text-sm font-medium">
          Primary Specialty
        </Label>
        <Select value={primarySpecialty} onValueChange={setPrimarySpecialty}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select your main specialty" />
          </SelectTrigger>
          <SelectContent>
            {specialties.map((specialty) => (
              <SelectItem key={specialty} value={specialty}>
                {specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website" className="text-sm font-medium">
          Website (Optional)
        </Label>
        <Input
          id="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourwebsite.com"
          type="url"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description *
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us about your business..."
          className="w-full min-h-[120px] resize-none"
        />
      </div>
    </div>
  );
};