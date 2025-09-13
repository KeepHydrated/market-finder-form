import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddProductFormProps {
  open: boolean;
  onClose: () => void;
  onProductAdded: (product: { name: string; description: string; price: number; images: File[] }) => void;
  editingProduct?: { id: number; name: string; description: string; price: number; images: string[] } | null;
}

export const AddProductForm = ({ open, onClose, onProductAdded, editingProduct }: AddProductFormProps) => {
  const [productName, setProductName] = useState(editingProduct?.name || '');
  const [description, setDescription] = useState(editingProduct?.description || '');
  const [price, setPrice] = useState(editingProduct?.price?.toString() || '');
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(editingProduct?.images || []);
  const { toast } = useToast();

  // Update form when editingProduct changes
  useEffect(() => {
    if (editingProduct) {
      setProductName(editingProduct.name);
      setDescription(editingProduct.description);
      setPrice(editingProduct.price.toString());
      setExistingImages(editingProduct.images);
      setImages([]);
    } else {
      setProductName('');
      setDescription('');
      setPrice('');
      setExistingImages([]);
      setImages([]);
    }
  }, [editingProduct]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = images.length + existingImages.length;
    const remainingSlots = 5 - totalImages;
    
    // Take only the first files that fit within the limit
    const filesToAdd = files.slice(0, remainingSlots);
    
    setImages(prev => [...prev, ...filesToAdd]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!productName || !description || !price) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Combine existing images (as base64) and new images (as Files)
    const combinedImages = [...existingImages, ...images];
    
    onProductAdded({
      name: productName,
      description,
      price: parseFloat(price),
      images: combinedImages as any // Mix of base64 strings and File objects
    });
    
    // Reset form
    setProductName('');
    setDescription('');
    setPrice('');
    setImages([]);
    setExistingImages([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Product Images (Up to 5)</Label>
            
            {/* Image Upload Area */}
            <div className="border-2 border-dashed border-border rounded-lg p-6">
              <div className="flex flex-col items-center justify-center text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop images here, or click to select
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={images.length + existingImages.length >= 5}
                />
                <Label
                  htmlFor="image-upload"
                  className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted ${
                    images.length + existingImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Choose Images
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  {images.length + existingImages.length}/5 images uploaded
                </p>
              </div>
            </div>

            {/* Image Previews */}
            {(existingImages.length > 0 || images.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {/* Existing images */}
                {existingImages.map((image, index) => (
                  <div key={`existing-${index}`} className="relative group">
                    <div className="aspect-square rounded-lg border border-border overflow-hidden bg-muted">
                      <img
                        src={image}
                        alt={`Existing product image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeExistingImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {/* New images */}
                {images.map((image, index) => (
                  <div key={`new-${index}`} className="relative group">
                    <div className="aspect-square rounded-lg border border-border overflow-hidden bg-muted">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name *</Label>
            <Input
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editingProduct ? 'Update Product' : 'Add Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};