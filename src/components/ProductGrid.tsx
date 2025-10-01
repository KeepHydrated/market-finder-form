import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, X, ImageIcon, Edit } from "lucide-react";
import { ChevronLeft, ChevronRight, MoreVertical, Copy, Trash2, Heart } from "lucide-react";
import { ProductDetailModal } from "./ProductDetailModal";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string[];
}

interface ProductGridProps {
  products: Product[];
  onDeleteProduct?: (productId: number) => void;
  onDuplicateProduct?: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  vendorId?: string;
  vendorName?: string;
  hideVendorName?: boolean;
  initialProductId?: string; // Product ID to open on mount
}

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
  onDeleteProduct?: (productId: number) => void;
  onDuplicateClick?: (product: Product) => void;
  onEditClick?: (product: Product) => void;
  vendorId?: string;
  vendorName?: string;
}

const ProductCard = ({ product, onProductClick, onDeleteProduct, onDuplicateClick, onEditClick, vendorId, vendorName }: ProductCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { toggleLike, isLiked } = useLikes();

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    setCurrentImageIndex((prev) => 
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    setCurrentImageIndex((prev) => 
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={() => onProductClick(product)}
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted relative group rounded-t-lg">
        {product.images.length > 0 ? (
          <>
             <img
               src={product.images[currentImageIndex]}
               alt={`${product.name} - Image ${currentImageIndex + 1}`}
               className="w-full h-full object-cover transition-opacity duration-200 rounded-t-lg"
             />
            
            {/* Like Button */}
            {vendorId && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm z-10"
                onClick={async (e) => {
                  e.stopPropagation();
                  await toggleLike(`${vendorId}-${product.id}`, 'product');
                }}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isLiked(`${vendorId}-${product.id}`, 'product')
                      ? "text-red-500 fill-current" 
                      : "text-gray-600"
                  )} 
                />
              </Button>
            )}
            
            {/* Navigation arrows - only show if more than 1 image */}
            {product.images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 bg-black/80 hover:bg-black text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 bg-black/80 hover:bg-black text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Image indicators */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {product.images.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-normal text-sm flex-1">{product.name}</h3>
            {(onDeleteProduct || onDuplicateClick || onEditClick) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {onEditClick && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick(product);
                    }}
                    className="cursor-pointer"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDuplicateClick && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateClick(product);
                    }}
                    className="cursor-pointer"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                )}
                {onDeleteProduct && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProduct(product.id);
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            ${product.price.toFixed(2)}
          </span>
        </div>
        {vendorName && !onDeleteProduct && (
          <div className="mt-2 pt-2 border-t border-muted">
            <button 
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              {vendorName}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ProductGrid = ({ products, onDeleteProduct, onDuplicateProduct, onEditProduct, vendorId, vendorName, hideVendorName = false, initialProductId }: ProductGridProps) => {
  // Character limits
  const NAME_LIMIT = 20;
  const DESCRIPTION_LIMIT = 200;
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Duplicate form states
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [websiteSaleEnabled, setWebsiteSaleEnabled] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Open product modal if initialProductId is provided
  useEffect(() => {
    if (initialProductId && products.length > 0) {
      console.log('ProductGrid: Opening modal for product ID:', initialProductId);
      const productId = parseInt(initialProductId);
      console.log('ProductGrid: Parsed product ID:', productId);
      console.log('ProductGrid: Available products:', products.map(p => ({ id: p.id, name: p.name })));
      const product = products.find(p => p.id === productId);
      console.log('ProductGrid: Found product:', product);
      if (product) {
        setSelectedProduct(product);
        setIsModalOpen(true);
      } else {
        console.warn('ProductGrid: Product not found with ID:', productId);
      }
    }
  }, [initialProductId, products]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleDuplicateClick = (product: Product) => {
    setDuplicateProduct(product);
    // Pre-fill the form with product data
    setProductName(product.name);
    setDescription(product.description);
    setPrice(product.price.toString());
    setExistingImages(product.images);
    setImages([]);
    setWebsiteSaleEnabled(true);
    setIsDuplicateModalOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditProduct(product);
    // Pre-fill the form with product data
    setProductName(product.name);
    setDescription(product.description);
    setPrice(product.price.toString());
    setExistingImages(product.images);
    setImages([]);
    setWebsiteSaleEnabled(true);
    setIsEditModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = images.length + existingImages.length;
    const remainingSlots = 5 - totalImages;
    
    const filesToAdd = files.slice(0, remainingSlots);
    setImages(prev => [...prev, ...filesToAdd]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (imageFiles: File[]): Promise<string[]> => {
    if (!user) return [];
    
    const uploadPromises = imageFiles.map(async (image, index) => {
      const fileExt = image.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${index}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, image);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleDuplicateSubmit = async () => {
    if (!productName || !description || !price) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to duplicate products.",
        variant: "destructive",
      });
      return;
    }

    // Check if any changes have been made
    if (duplicateProduct) {
      const hasNameChanged = productName !== duplicateProduct.name;
      const hasDescriptionChanged = description !== duplicateProduct.description;
      const hasPriceChanged = parseFloat(price) !== duplicateProduct.price;
      const hasImagesChanged = images.length > 0 || existingImages.length !== duplicateProduct.images.length;
      
      if (!hasNameChanged && !hasDescriptionChanged && !hasPriceChanged && !hasImagesChanged) {
        toast({
          title: "No changes made",
          description: "Please make some changes before saving the duplicate.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsUploading(true);
    
    try {
      const uploadedImageUrls = images.length > 0 ? await uploadImages(images) : [];
      const allImageUrls = [...existingImages, ...uploadedImageUrls];
      
      const productData = {
        name: productName,
        description,
        price: parseFloat(price),
        images: allImageUrls,
        websiteSaleEnabled
      };
      
      if (onDuplicateProduct) {
        onDuplicateProduct(productData as any);
      }
      
      handleCancelDuplicate();
      toast({
        title: "Product duplicated",
        description: "Product has been duplicated successfully.",
      });
      
    } catch (error: any) {
      console.error('Error duplicating product:', error);
      toast({
        title: "Duplication failed",
        description: error.message || "Failed to duplicate product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelDuplicate = () => {
    setIsDuplicateModalOpen(false);
    setDuplicateProduct(null);
    setProductName('');
    setDescription('');
    setPrice('');
    setImages([]);
    setExistingImages([]);
    setWebsiteSaleEnabled(true);
  };

  const handleEditSubmit = async () => {
    if (!productName || !description || !price) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to edit products.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const uploadedImageUrls = images.length > 0 ? await uploadImages(images) : [];
      const allImageUrls = [...existingImages, ...uploadedImageUrls];
      
      const productData = {
        ...editProduct,
        name: productName,
        description,
        price: parseFloat(price),
        images: allImageUrls,
        websiteSaleEnabled
      };
      
      if (onEditProduct) {
        onEditProduct(productData as any);
      }
      
      handleCancelEdit();
      toast({
        title: "Product updated",
        description: "Product has been updated successfully.",
      });
      
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditProduct(null);
    setProductName('');
    setDescription('');
    setPrice('');
    setImages([]);
    setExistingImages([]);
    setWebsiteSaleEnabled(true);
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No products added yet. Click "Add Product" to get started.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...products].reverse().map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onProductClick={handleProductClick}
            onDeleteProduct={onDeleteProduct}
            onDuplicateClick={onDuplicateProduct ? handleDuplicateClick : undefined}
            onEditClick={onEditProduct ? handleEditClick : undefined}
            vendorId={vendorId}
            vendorName={vendorName}
          />
        ))}
      </div>
      
      <ProductDetailModal
        product={selectedProduct}
        products={products}
        open={isModalOpen}
        onClose={handleCloseModal}
        onProductChange={setSelectedProduct}
        vendorId={vendorId}
        vendorName={vendorName}
        hideVendorName={hideVendorName}
      />

      <Dialog open={isDuplicateModalOpen} onOpenChange={setIsDuplicateModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Duplicate Product</DialogTitle>
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
                    id="duplicate-image-upload"
                    disabled={images.length + existingImages.length >= 5}
                  />
                  <Label
                    htmlFor="duplicate-image-upload"
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
              <div className="flex justify-between items-center">
                <Label htmlFor="duplicate-product-name">Product Name *</Label>
                <span className="text-xs text-muted-foreground">
                  {productName.length}/{NAME_LIMIT}
                </span>
              </div>
              <Input
                id="duplicate-product-name"
                value={productName}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= NAME_LIMIT) {
                    setProductName(value);
                  }
                }}
                placeholder="Enter product name"
                maxLength={NAME_LIMIT}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="duplicate-description">Description *</Label>
                <span className="text-xs text-muted-foreground">
                  {description.length}/{DESCRIPTION_LIMIT}
                </span>
              </div>
              <Textarea
                id="duplicate-description"
                value={description}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= DESCRIPTION_LIMIT) {
                    setDescription(value);
                  }
                }}
                placeholder="Describe your product..."
                className="min-h-[100px] resize-none"
                maxLength={DESCRIPTION_LIMIT}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicate-price">Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="duplicate-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <Label htmlFor="duplicate-website-sale" className="text-sm font-medium">
                  Available for Online Purchase
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow customers to buy this product directly from your online store
                </p>
              </div>
              <Switch
                id="duplicate-website-sale"
                checked={websiteSaleEnabled}
                onCheckedChange={setWebsiteSaleEnabled}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button variant="outline" onClick={handleCancelDuplicate} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleDuplicateSubmit} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Duplicate Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Edit Product</DialogTitle>
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
                    id="edit-image-upload"
                    disabled={images.length + existingImages.length >= 5}
                  />
                  <Label
                    htmlFor="edit-image-upload"
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
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-product-name">Product Name *</Label>
                <span className="text-xs text-muted-foreground">
                  {productName.length}/{NAME_LIMIT}
                </span>
              </div>
              <Input
                id="edit-product-name"
                value={productName}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= NAME_LIMIT) {
                    setProductName(value);
                  }
                }}
                placeholder="Enter product name"
                maxLength={NAME_LIMIT}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-description">Description *</Label>
                <span className="text-xs text-muted-foreground">
                  {description.length}/{DESCRIPTION_LIMIT}
                </span>
              </div>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= DESCRIPTION_LIMIT) {
                    setDescription(value);
                  }
                }}
                placeholder="Describe your product..."
                className="min-h-[100px] resize-none"
                maxLength={DESCRIPTION_LIMIT}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <Label htmlFor="edit-website-sale" className="text-sm font-medium">
                  Available for Online Purchase
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow customers to buy this product directly from your online store
                </p>
              </div>
              <Switch
                id="edit-website-sale"
                checked={websiteSaleEnabled}
                onCheckedChange={setWebsiteSaleEnabled}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button variant="outline" onClick={handleCancelEdit} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Update Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};