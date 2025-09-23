import { useState, useEffect, useCallback } from "react";
import { FarmersMarketSearch } from "@/components/FarmersMarketSearch";
import { AddProductForm } from "@/components/AddProductForm";
import { ProductGrid } from "@/components/ProductGrid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VendorApplication, VendorApplicationData } from "@/components/VendorApplication";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";


interface FarmersMarket {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  photos?: { photo_reference: string }[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string[];
}

interface SubmitContentProps {
  user: any;
}

export const SubmitContent = ({ user }: SubmitContentProps) => {
  const { toast } = useToast();
  const [selectedMarkets, setSelectedMarkets] = useState<FarmersMarket[]>([]);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorApplicationData, setVendorApplicationData] = useState<VendorApplicationData>({
    storeName: "",
    primarySpecialty: "",
    website: "",
    description: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Memoize localStorage operations
  const loadProducts = useCallback(() => {
    try {
      const savedProducts = localStorage.getItem('farmer-market-products');
      if (savedProducts) {
        const parsedProducts = JSON.parse(savedProducts);
        setProducts(parsedProducts);
      }
    } catch (error) {
      console.error('Failed to parse saved products:', error);
    }
  }, []);

  const saveProducts = useCallback((productsToSave: Product[]) => {
    if (productsToSave.length > 0) {
      localStorage.setItem('farmer-market-products', JSON.stringify(productsToSave));
    }
  }, []);

  // Load products once on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Save products when they change
  useEffect(() => {
    if (products.length > 0) {
      saveProducts(products);
    }
  }, [products, saveProducts]);

  const handleMarketsChange = useCallback((markets: FarmersMarket[]) => {
    setSelectedMarkets(markets);
  }, []);

  const handleAddProduct = useCallback(() => {
    setShowAddProductForm(true);
  }, []);

  const handleProductAdded = useCallback((product: { name: string; description: string; price: number; images: string[] }) => {
    const newProduct: Product = {
      id: Date.now(),
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images // Now already URLs from storage
    };
    
    setProducts(prev => [...prev, newProduct]);
    setShowAddProductForm(false);
    toast({
      title: "Product Added",
      description: "Your product has been successfully added.",
    });
  }, [toast]);

  const handleDeleteProduct = useCallback((productId: number) => {
    setProducts(prev => prev.filter(product => product.id !== productId));
    toast({
      title: "Product Deleted", 
      description: "The product has been successfully deleted.",
    });
  }, [toast]);

  const handleDuplicateProduct = useCallback((product: Product) => {
    const duplicatedProduct: Product = {
      ...product,
      id: Date.now(),
      name: `${product.name} (Copy)`
    };
    setProducts(prev => [...prev, duplicatedProduct]);
    toast({
      title: "Product Duplicated",
      description: "The product has been successfully duplicated.",
    });
  }, [toast]);

  const handleEditProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    setShowAddProductForm(true);
  }, []);

  const handleDeleteShop = useCallback(async () => {
    try {
      // Clear localStorage
      localStorage.removeItem('farmer-market-products');
      
      // Delete user's submissions from database
      if (user) {
        const { error } = await supabase
          .from('submissions')
          .delete()
          .eq('user_id', user.id);
        
        if (error) throw error;
      }
      
      // Reset all state
      setProducts([]);
      setSelectedMarkets([]);
      setVendorApplicationData({
        storeName: "",
        primarySpecialty: "",
        website: "",
        description: ""
      });
      setIsSubmitted(false);
      
      toast({
        title: "Shop Deleted",
        description: "All shop data has been successfully deleted.",
      });
    } catch (error: any) {
      console.error('Error deleting shop:', error);
      toast({
        title: "Error",
        description: `Failed to delete shop: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  }, [user, toast]);

  const handleSubmit = useCallback(async () => {
    if (!user || !vendorApplicationData.storeName.trim() || !vendorApplicationData.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate that at least one market is selected
    if (selectedMarkets.length === 0) {
      toast({
        title: "Market Required",
        description: "Please select at least one market to apply to.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          store_name: vendorApplicationData.storeName,
          primary_specialty: vendorApplicationData.primarySpecialty,
          website: vendorApplicationData.website,
          description: vendorApplicationData.description,
          products: JSON.stringify(products),
          selected_markets: JSON.stringify(selectedMarkets.map(m => m.structured_formatting?.main_text || m.name)),
          market_data: JSON.stringify(selectedMarkets),
          status: 'accepted'
        });

      if (error) throw error;
      
      setIsSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "Your vendor application has been submitted successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to submit application: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  }, [user, vendorApplicationData, products, selectedMarkets, toast]);

  return (
    <>
      {isSubmitted && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <h3 className="text-lg font-semibold">Application Submitted Successfully!</h3>
          </div>
          <p className="text-center text-green-600 mt-2">
            Your vendor application has been submitted and is being reviewed.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Which farmers markets do you sell at? (Up to 3) *
        </label>
        <FarmersMarketSearch 
          selectedMarkets={selectedMarkets}
          onMarketsChange={handleMarketsChange}
          maxMarkets={3}
          isEditing={!isSubmitted}
        />
      </div>
      
      <Card className="mt-8 p-8 bg-card border-border">
        <VendorApplication 
          data={vendorApplicationData}
          onChange={setVendorApplicationData}
          readOnly={isSubmitted}
        />
      </Card>
      
      <Card className="mt-8 p-8 bg-card border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Products</h2>
          {!isSubmitted && (
            <Button className="flex items-center gap-2" onClick={handleAddProduct}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          )}
        </div>
        <ProductGrid 
          products={products} 
          onDeleteProduct={handleDeleteProduct}
          onDuplicateProduct={handleDuplicateProduct}
          onEditProduct={handleEditProduct}
        />
      </Card>

      <div className="mt-8 flex justify-center gap-4">
        {!isSubmitted ? (
          <>
            <Button 
              variant="destructive"
              onClick={handleDeleteShop}
              className="px-8 py-3 text-lg"
            >
              Delete Shop
            </Button>
            <Button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-12 py-3 text-lg"
              onClick={handleSubmit}
            >
              Submit Application
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="destructive"
              onClick={handleDeleteShop}
              className="px-8 py-3 text-lg"
            >
              Delete Shop
            </Button>
            <div className="flex items-center gap-3 px-12 py-3 bg-green-100 text-green-700 rounded-md">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-lg font-medium">Application Submitted</span>
            </div>
          </>
        )}
      </div>

      
      <AddProductForm 
        open={showAddProductForm} 
        onClose={() => {
          setShowAddProductForm(false);
          setEditingProduct(null);
        }}
        onProductAdded={editingProduct ? async (productData: any) => {
          if (!editingProduct) return;
          // Handle product update logic here
          setShowAddProductForm(false);
          setEditingProduct(null);
        } : handleProductAdded}
        editingProduct={editingProduct}
      />
    </>
  );
};