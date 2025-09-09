import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VendorApplicationFormProps {
  open: boolean;
  onClose: () => void;
  marketName: string;
}

const SPECIALTIES = [
  "Fresh Produce",
  "Organic Vegetables", 
  "Fruits",
  "Herbs & Spices",
  "Baked Goods",
  "Dairy Products",
  "Meat & Poultry",
  "Prepared Foods",
  "Flowers & Plants",
  "Artisan Crafts",
  "Honey & Preserves",
  "Other"
];

export const VendorApplicationForm = ({ open, onClose, marketName }: VendorApplicationFormProps) => {
  const [formData, setFormData] = useState({
    storeName: '',
    specialty: '',
    website: '',
    description: ''
  });

  const handleSubmit = () => {
    // In a real app, this would submit to an API
    console.log("Vendor application:", { ...formData, marketName });
    onClose();
    // Reset form
    setFormData({
      storeName: '',
      specialty: '',
      website: '',
      description: ''
    });
  };

  const isFormValid = formData.storeName.trim() && formData.specialty && formData.description.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply to {marketName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="store-name">
              Store Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="store-name"
              value={formData.storeName}
              onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
              placeholder="e.g., Fresh Produce Stand"
            />
          </div>

          <div className="space-y-2">
            <Label>Primary Specialty</Label>
            <Select 
              value={formData.specialty} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, specialty: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your main specialty" />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (Optional)</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell us about your products, farming practices, and what makes your business special..."
              className="min-h-[120px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            Submit Application
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};