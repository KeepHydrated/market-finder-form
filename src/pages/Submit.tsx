import { useState, useEffect } from "react";
import { MarketSearch } from "@/components/MarketSearch";
import { MarketDetails } from "@/components/MarketDetails";
import { AddMarketForm } from "@/components/AddMarketForm";
import { AddProductForm } from "@/components/AddProductForm";
import { ProductGrid } from "@/components/ProductGrid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VendorApplication, VendorApplicationData } from "@/components/VendorApplication";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

// Sample data - in a real app, this would come from an API
const sampleMarkets = [
  {
    id: 1,
    name: "Downtown Farmers Market",
    address: "123 Main Street",
    city: "Springfield",
    state: "IL",
    days: ["Wed", "Sat"],
    hours: "8:00 AM - 2:00 PM"
  },
  {
    id: 2,
    name: "Riverside Community Market", 
    address: "456 River Road",
    city: "Madison",
    state: "WI",
    days: ["Thu", "Sun"],
    hours: "9:00 AM - 3:00 PM"
  },
  {
    id: 3,
    name: "Sunset Valley Market",
    address: "789 Valley Ave",
    city: "Portland", 
    state: "OR",
    days: ["Fri", "Sat", "Sun"],
    hours: "7:00 AM - 1:00 PM"
  },
  {
    id: 4,
    name: "Green Hills Market",
    address: "321 Oak Street",
    city: "Austin",
    state: "TX", 
    days: ["Sat"],
    hours: "8:00 AM - 2:00 PM"
  },
  {
    id: 5,
    name: "Valley Fresh Market",
    address: "654 Pine Avenue",
    city: "Denver",
    state: "CO",
    days: ["Wed", "Fri", "Sat"],
    hours: "9:00 AM - 4:00 PM"
  }
];

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

const Submit = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
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
  const [customMarketData, setCustomMarketData] = useState<{
    name: string;
    address: string;
    days: string[];
    hours: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>;
  } | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Load products from localStorage on component mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('farmer-market-products');
    if (savedProducts) {
      try {
        const parsedProducts = JSON.parse(savedProducts);
        setProducts(parsedProducts);
      } catch (error) {
        console.error('Failed to parse saved products:', error);
      }
    }
  }, []);

  // Save products to localStorage whenever products change
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('farmer-market-products', JSON.stringify(products));
    }
  }, [products]);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
  };

  const handleBackToSearch = () => {
    setSelectedMarket(null);
  };

  const handleAddMarket = () => {
    setShowAddForm(true);
  };

  const handleCloseAddForm = () => {
    setShowAddForm(false);
  };

  const handleMarketAdded = (marketData: {
    name: string;
    address: string;
    days: string[];
    hours: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>;
  }) => {
    setSearchTerm(marketData.name);
    setSubmittedMarketName(marketData.name);
    setCustomMarketData(marketData);
  };

  const handleAddProduct = () => {
    setShowAddProductForm(true);
  };

  const handleCloseAddProductForm = () => {
    setShowAddProductForm(false);
  };

  const handleProductAdded = async (product: { name: string; description: string; price: number; images: File[] }) => {
    // Convert File objects to base64 strings for persistence
    const imagePromises = product.images.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const imageBase64Array = await Promise.all(imagePromises);

    const newProduct: Product = {
      id: Date.now(), // Simple ID generation
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
  };

  // Handle product deletion
  const handleDeleteProduct = (productId: number) => {
    setProducts(prev => prev.filter(product => product.id !== productId));
    toast({
      title: "Product Deleted",
      description: "The product has been successfully deleted.",
    });
  };

  // Handle product duplication
  const handleDuplicateProduct = (product: Product) => {
    const duplicatedProduct: Product = {
      ...product,
      id: Date.now(), // Generate new ID
      name: `${product.name} (Copy)`
    };
    setProducts(prev => [...prev, duplicatedProduct]);
    toast({
      title: "Product Duplicated",
      description: "The product has been successfully duplicated.",
    });
  };

  // Handle product editing
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowAddProductForm(true);
  };

  // Handle product update (when editing)
  const handleProductUpdated = async (productData: { name: string; description: string; price: number; images: any[] }) => {
    if (!editingProduct) return;

    // Process images: convert File objects to base64, keep existing base64 strings
    const processedImages: string[] = [];
    
    for (const image of productData.images) {
      if (typeof image === 'string') {
        // Already a base64 string (existing image)
        processedImages.push(image);
      } else {
        // File object (new image), convert to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(image);
        });
        processedImages.push(base64);
      }
    }

    const updatedProduct: Product = {
      ...editingProduct,
      name: productData.name,
      description: productData.description,
      price: productData.price,
      images: processedImages
    };
    
    setProducts(prev => prev.map(product => 
      product.id === editingProduct.id ? updatedProduct : product
    ));
    setShowAddProductForm(false);
    setEditingProduct(null);
    toast({
      title: "Product Updated",
      description: "Your product has been successfully updated.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <AuthForm onSuccess={() => {
          toast({
            title: "Welcome!",
            description: "You've successfully signed in.",
          });
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Submit Your Farmers Market</h1>
            <p className="text-muted-foreground">Apply to become a vendor at local farmers markets</p>
          </div>

          {selectedMarket ? (
            <MarketDetails 
              market={selectedMarket} 
              onBack={handleBackToSearch} 
            />
          ) : (
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
                markets={sampleMarkets}
                onSelectMarket={handleSelectMarket}
                onAddMarket={handleAddMarket}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                submittedMarketName={submittedMarketName}
                disabled={isSubmitted}
              />
              
              {/* Vendor Application Form */}
              <Card className="mt-8 p-8 bg-card border-border">
                <VendorApplication 
                  data={vendorApplicationData}
                  onChange={setVendorApplicationData}
                  readOnly={isSubmitted}
                />
              </Card>
              
              {/* Products Section */}
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

              {/* Submit Button */}
              <div className="mt-8 flex justify-center">
                {!isSubmitted ? (
                  <Button 
                    className="bg-blue-500 hover:bg-blue-600 text-white px-12 py-3 text-lg"
                    onClick={async () => {
                      console.log('Submit button clicked!');
                      console.log('User:', user);
                      console.log('Vendor data:', vendorApplicationData);
                      console.log('Products:', products);
                      
                      if (!user) {
                        console.error('No user found');
                        return;
                      }
                      
                      // Validate required fields
                      if (!vendorApplicationData.storeName.trim()) {
                        toast({
                          title: "Missing Information",
                          description: "Please fill in the store name.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      if (!vendorApplicationData.description.trim()) {
                        toast({
                          title: "Missing Information",
                          description: "Please fill in the description.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      try {
                        console.log('Attempting to submit to database...');
                        const insertData = {
                          user_id: user.id,
                          store_name: vendorApplicationData.storeName,
                          primary_specialty: vendorApplicationData.primarySpecialty,
                          website: vendorApplicationData.website,
                          description: vendorApplicationData.description,
                          products: JSON.stringify(products),
                          selected_market: selectedMarket?.name || customMarketData?.name || null,
                          search_term: selectedMarket ? null : searchTerm,
                          market_address: customMarketData?.address || null,
                          market_days: customMarketData?.days || null,
                          market_hours: customMarketData?.hours || null,
                          status: 'pending'
                        };
                        console.log('Data to insert:', insertData);
                        
                        const { error } = await supabase
                          .from('submissions')
                          .insert(insertData);

                        if (error) {
                          console.error('Database error:', error);
                          throw error;
                        }

                        console.log('Submission successful!');
                        
                        // Set submitted state instead of resetting form
                        setIsSubmitted(true);
                        
                        toast({
                          title: "Application Submitted",
                          description: "Your vendor application has been submitted successfully!",
                        });

                      } catch (error) {
                        console.error('Submission error:', error);
                        toast({
                          title: "Error",
                          description: `Failed to submit application: ${error.message || 'Unknown error'}`,
                          variant: "destructive"
                        });
                      }
                    }}
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
            </>
          )}
        </div>
      </div>

      <AddMarketForm 
        open={showAddForm} 
        onClose={handleCloseAddForm}
        onMarketAdded={handleMarketAdded}
      />
      
      <AddProductForm 
        open={showAddProductForm} 
        onClose={() => {
          handleCloseAddProductForm();
          setEditingProduct(null);
        }}
        onProductAdded={editingProduct ? handleProductUpdated : handleProductAdded}
        editingProduct={editingProduct}
      />
    </div>
  );
};

export default Submit;
