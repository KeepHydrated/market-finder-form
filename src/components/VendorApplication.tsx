import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface VendorApplicationData {
  storeName: string;
  primarySpecialty: string;
  website: string;
  description: string;
}

export type { VendorApplicationData };

interface VendorApplicationProps {
  data?: VendorApplicationData;
  onChange?: (data: VendorApplicationData) => void;
  readOnly?: boolean;
}

export const VendorApplication = ({ data, onChange, readOnly = false }: VendorApplicationProps) => {
  console.log('VendorApplication rendered with:', { data, onChange: !!onChange, readOnly });
  
  const currentData = data || {
    storeName: "",
    primarySpecialty: "",
    website: "",
    description: ""
  };

  const updateData = (field: keyof VendorApplicationData, value: string) => {
    console.log(`updateData called - field: ${field}, value: "${value}", length: ${value.length}`);
    console.log('onChange exists:', !!onChange, 'readOnly:', readOnly);
    
    if (onChange && !readOnly) {
      console.log(`Updating ${field}: original length = ${value.length}, value = "${value}"`);
      
      // Apply character limits immediately
      let truncatedValue = value;
      if (field === 'storeName' && value.length > 20) {
        truncatedValue = value.slice(0, 20);
        console.log(`Truncated storeName to: "${truncatedValue}" (${truncatedValue.length} chars)`);
      }
      
      if (field === 'description' && value.length > 500) {
        truncatedValue = value.slice(0, 500);
        console.log(`Truncated description to: "${truncatedValue}" (${truncatedValue.length} chars)`);
      }
      
      console.log(`Final value for ${field}: "${truncatedValue}"`);
      
      onChange({
        ...currentData,
        [field]: truncatedValue
      });
    } else {
      console.log('Not updating because onChange is missing or readOnly is true');
    }
  };

  const specialties = [
    "Fresh Flowers & Plants",
    "Bakery",
    "Dairy",
    "Rancher",
    "Beverages",
    "Seasonings & Spices",
    "Pets",
    "Home Goods",
    "Farmers",
    "Ready to Eat",
    "Packaged Goods & Snacks",
    "Artisan"
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="store-name" className="text-lg font-medium text-foreground">
            Store Name *
          </Label>
          <Input
            id="store-name"
            value={currentData.storeName}
            onChange={(e) => updateData('storeName', e.target.value)}
            placeholder="e.g., Fresh Produce Stand"
            className="h-14 text-lg border-2 border-border rounded-xl"
            disabled={readOnly}
            maxLength={20}
          />
          <div className="text-sm text-muted-foreground text-right">
            {currentData.storeName.length}/20 characters
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="primary-specialty" className="text-lg font-medium text-foreground">
            Category *
          </Label>
          <Select 
            value={currentData.primarySpecialty} 
            onValueChange={(value) => updateData('primarySpecialty', value)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-14 text-lg border-2 border-border rounded-xl">
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
          <Label htmlFor="website" className="text-lg font-medium text-foreground">
            Website (Optional)
          </Label>
          <Input
            id="website"
            value={currentData.website}
            onChange={(e) => updateData('website', e.target.value)}
            placeholder="https://yourwebsite.com"
            type="url"
            className="h-14 text-lg border-2 border-border rounded-xl"
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-lg font-medium text-foreground">
            Description *
          </Label>
          <Textarea
            id="description"
            value={currentData.description}
            onChange={(e) => updateData('description', e.target.value)}
            placeholder="Tell us about your business..."
            className="min-h-[120px] text-lg border-2 border-border rounded-xl resize-none"
            disabled={readOnly}
            maxLength={500}
          />
          <div className="text-sm text-muted-foreground text-right mt-1">
            {currentData.description.length}/500 characters
          </div>
        </div>
      </div>
    </div>
  );
};