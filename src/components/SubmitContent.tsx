import { useState, useEffect, useCallback } from "react";
import { MarketSearch } from "@/components/MarketSearch";
import { MarketDetails } from "@/components/MarketDetails";
import { AddMarketForm } from "@/components/AddMarketForm";
import { AddProductForm } from "@/components/AddProductForm";
import { ProductGrid } from "@/components/ProductGrid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VendorApplication, VendorApplicationData } from "@/components/VendorApplication";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";


interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  days: string[];
  hours: string;
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
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<Market[]>([]);
  const [activeMarketTab, setActiveMarketTab] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedMarketName, setSubmittedMarketName] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorApplicationData, setVendorApplicationData] = useState<VendorApplicationData>({
    storeName: "",
    primarySpecialty: "",
    website: "",
    description: ""
  });
  const [customMarketData, setCustomMarketData] = useState<any>(null);
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

  // Load markets from database
  const loadMarkets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setMarkets(data || []);
    } catch (error) {
      console.error('Error loading markets:', error);
    }
  }, []);

  // Load products once on mount
  useEffect(() => {
    loadProducts();
    loadMarkets();
  }, [loadProducts, loadMarkets]);

  // Save products when they change
  useEffect(() => {
    if (products.length > 0) {
      saveProducts(products);
    }
  }, [products, saveProducts]);

  const handleSelectMarket = useCallback((market: Market) => {
    setSelectedMarkets(prev => [...prev, market]);
  }, []);

  const handleRemoveMarket = useCallback((market: Market) => {
    setSelectedMarkets(prev => prev.filter(m => m.id !== market.id));
  }, []);

  const handleReplaceMarket = useCallback((oldMarket: Market, newMarket: Market) => {
    setSelectedMarkets(prev => prev.map(m => m.id === oldMarket.id ? newMarket : m));
  }, []);

  const handleAddMarket = useCallback((replacementMarket?: Market) => {
    setShowAddForm(true);
    // TODO: Store replacement market context for when the submission is approved
    // This will be used to replace the selected market if there is one
  }, []);

  const handleMarketAdded = useCallback(async (marketData: any) => {
    console.log('🔍 handleMarketAdded called with:', marketData);
    console.log('🔍 handleMarketAdded function actually executing!');
    try {
      // Extract city and state from address
      const addressParts = marketData.address.split(',').map((part: string) => part.trim());
      let city = '';
      let state = '';
      
      if (addressParts.length >= 2) {
        // For format like "Place, Street, City, State" or "Place, City, State"
        city = addressParts[addressParts.length - 2] || '';
        const lastPart = addressParts[addressParts.length - 1] || '';
        // Extract state (first 2 chars if it contains state abbreviation)
        const stateMatch = lastPart.match(/\b[A-Z]{2}\b/);
        state = stateMatch ? stateMatch[0] : lastPart.substring(0, 2).toUpperCase();
      }
      
      // Normalize days array (ensure it's an array)
      const normalizedDays = Array.isArray(marketData.days) ? marketData.days : 
                            marketData.days ? [marketData.days] : [];
      
      // Insert market into database
      const { data, error } = await supabase
        .from('markets')
        .insert({
          name: marketData.name,
          address: marketData.address,
          city: city || 'Unknown',
          state: state || 'Unknown',
          days: normalizedDays,
          hours: marketData.hours || null
        })
        .select()
        .single();

      if (error) {
        console.error('🚨 Database error:', error);
        throw error;
      }

      console.log('✅ Market inserted successfully:', data);

      // Add new market to local state
      const newMarket: Market = {
        id: data.id,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        days: data.days,
        hours: data.hours || ''
      };
      
      console.log('🔍 Creating newMarket object:', newMarket);
      
      setMarkets(prev => {
        console.log('🔍 Previous markets:', prev);
        const updated = [...prev, newMarket];
        console.log('🔍 Updated markets:', updated);
        return updated;
      });
      setSelectedMarkets(prev => {
        console.log('🔍 Previous selectedMarkets:', prev);
        const updated = [...prev, newMarket];
        console.log('🔍 Updated selectedMarkets:', updated);
        return updated;
      });
      setSearchTerm(marketData.name);
      setSubmittedMarketName(marketData.name);
      setCustomMarketData(marketData);
      setShowAddForm(false);
      
      toast({
        title: "Market Created Successfully",
        description: "Your market has been added and is now available in the list.",
      });

    } catch (error: any) {
      console.error('Error adding market:', error);
      toast({
        title: "Error Adding Market",
        description: `Failed to add market: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
      // Don't close the modal on error so user can try again
    }
  }, [toast]);

  const handleAddProduct = useCallback(() => {
    setShowAddProductForm(true);
  }, []);

  const handleProductAdded = useCallback(async (product: { name: string; description: string; price: number; images: File[] }) => {
    const imagePromises = product.images.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const imageBase64Array = await Promise.all(imagePromises);
    const newProduct: Product = {
      id: Date.now(),
      name: product.name,
      description: product.description,
      price: product.price,
      images: imageBase64Array
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
          selected_markets: JSON.stringify(selectedMarkets.map(m => m.name)),
          market_data: JSON.stringify(selectedMarkets),
          status: 'pending'
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

      <MarketSearch 
        markets={markets}
        onSelectMarket={handleSelectMarket}
        onAddMarket={handleAddMarket}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        submittedMarketName={submittedMarketName}
        disabled={isSubmitted}
        selectedMarkets={selectedMarkets}
        onRemoveMarket={handleRemoveMarket}
        activeMarketTab={activeMarketTab}
        onMarketTabChange={setActiveMarketTab}
        onReplaceMarket={handleReplaceMarket}
      />
      
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

      <div className="mt-8 flex justify-center">
        {!isSubmitted ? (
          <Button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-12 py-3 text-lg"
            onClick={handleSubmit}
          >
            Submit Application
          </Button>
        ) : (
          <div className="flex items-center gap-3 px-12 py-3 bg-green-100 text-green-700 rounded-md">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-lg font-medium">Application Submitted</span>
          </div>
        )}
      </div>

      <AddMarketForm 
        open={showAddForm} 
        onClose={() => setShowAddForm(false)}
        onMarketAdded={handleMarketAdded}
      />
      
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