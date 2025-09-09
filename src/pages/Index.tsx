import { useState, useEffect } from "react";
import { MarketSearch } from "@/components/MarketSearch";
import { MarketDetails } from "@/components/MarketDetails";
import { AddMarketForm } from "@/components/AddMarketForm";
import { AddProductForm } from "@/components/AddProductForm";
import { ProductGrid } from "@/components/ProductGrid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VendorApplication } from "@/components/VendorApplication";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowLeft, RotateCcw, Upload, Edit } from "lucide-react";

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

const Index = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedMarketName, setSubmittedMarketName] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<string>("submit");
  const [profileData, setProfileData] = useState({
    username: "",
    zipcode: "",
    avatarUrl: ""
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  // Load profile data when user changes
  useEffect(() => {
    if (user && profile) {
      setProfileData({
        username: profile.full_name || user.email?.split('@')[0] || "",
        zipcode: profileData.zipcode,
        avatarUrl: profile.avatar_url || ""
      });
    }
  }, [user, profile]);

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

  const handleMarketAdded = (marketName: string) => {
    setSearchTerm(marketName);
    setSubmittedMarketName(marketName);
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

  // Handle profile picture upload
  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setProfileData(prev => ({
          ...prev,
          avatarUrl: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Get current location and convert to zipcode
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use a free reverse geocoding API to get actual zipcode
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (!response.ok) {
            throw new Error('Failed to fetch location data');
          }
          
          const data = await response.json();
          const zipcode = data.postcode || data.postalCode || 'Unknown';
          
          if (zipcode === 'Unknown') {
            throw new Error('Could not determine zipcode');
          }
          
          setProfileData(prev => ({
            ...prev,
            zipcode: zipcode
          }));
          
          toast({
            title: "Location found",
            description: `Zipcode updated to ${zipcode}`,
          });
        } catch (error) {
          console.error('Geocoding error:', error);
          toast({
            title: "Error",
            description: "Failed to get zipcode from your location. Please enter it manually.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        setIsLoadingLocation(false);
        let errorMessage = "Please allow location access to get your zipcode.";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location services and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Please enter your zipcode manually.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again or enter manually.";
            break;
        }
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;

    if (!isEditing) {
      // Switch to edit mode
      setIsEditing(true);
      return;
    }

    // Save the changes
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.username,
          avatar_url: profileData.avatarUrl
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      // Refetch the profile data to update it everywhere in the app
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching updated profile:', fetchError);
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      setIsEditing(false); // Exit edit mode after saving
      
      // Refresh the page to ensure all components see the updated profile
      window.location.reload();
    } catch (error) {
      console.error('Save profile error:', error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive"
      });
    }
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
      {/* Header spans full width */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {selectedMarket && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSearch}
                  className="mr-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h1 className="text-2xl font-bold">
                Farmer's Market Hub
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <UserMenu user={user} profile={profile} />
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar and Main Content */}
      <div className="flex">
        {/* Left Sidebar - Navigation Tabs */}
        <div className="w-64 bg-card border-r border-border min-h-[calc(100vh-4rem)]">
          <div className="p-4 space-y-2">
            <div 
              className={`px-4 py-3 rounded-md cursor-pointer transition-colors ${
                activeTab === "profile" 
                  ? "bg-primary/10 text-primary font-medium border border-primary/20" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </div>
            <div 
              className={`px-4 py-3 rounded-md cursor-pointer transition-colors ${
                activeTab === "account" 
                  ? "bg-primary/10 text-primary font-medium border border-primary/20" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveTab("account")}
            >
              Account
            </div>
            <div 
              className={`px-4 py-3 rounded-md cursor-pointer transition-colors ${
                activeTab === "submit" 
                  ? "bg-primary/10 text-primary font-medium border border-primary/20" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveTab("submit")}
            >
              Submit
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <main className="py-12">
            <div className="container mx-auto px-4">
              {selectedMarket ? (
                <MarketDetails 
                  market={selectedMarket} 
                  onBack={handleBackToSearch} 
                />
              ) : (
                <>
                  {activeTab === "account" && (
                    <div className="max-w-2xl mx-auto space-y-8">
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Email Address</h2>
                        <div className="bg-muted p-4 rounded-md mb-2 text-muted-foreground">
                          {user?.email}
                        </div>
                        <p className="text-sm text-muted-foreground">Your email address cannot be changed</p>
                      </div>

                      <div>
                        <h2 className="text-xl font-semibold mb-4">Password</h2>
                        <div className="flex gap-4 items-center mb-2">
                          <div className="bg-muted p-4 rounded-md flex-1 text-muted-foreground tracking-widest">
                            ••••••••••••
                          </div>
                          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                            Change Password
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Click to receive a password reset link via email</p>
                      </div>

                      <div className="border-t pt-8">
                        <h2 className="text-xl font-semibold mb-4 text-red-600">Danger Zone</h2>
                        <p className="text-muted-foreground mb-4">
                          Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <Button className="bg-red-600 hover:bg-red-700 text-white">
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  )}

                  {activeTab === "profile" && (
                    <div className="max-w-2xl mx-auto space-y-8">
                      {/* Profile Picture */}
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Profile Pic</h2>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProfilePictureUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/30 overflow-hidden">
                              {profileData.avatarUrl ? (
                                <img 
                                  src={profileData.avatarUrl} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Upload className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            JPG, PNG or GIF (max 5MB)
                          </div>
                        </div>
                      </div>

                      {/* Username */}
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Username</h2>
                        <Input 
                          value={profileData.username} 
                          onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                          className={isEditing ? "bg-background" : "bg-muted"}
                          placeholder="Enter your username"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Location</h2>
                        <div className="flex gap-4 items-center mb-2">
                          <Input 
                            value={profileData.zipcode}
                            onChange={(e) => setProfileData(prev => ({ ...prev, zipcode: e.target.value }))}
                            placeholder="Zipcode will appear here..." 
                            className={isEditing ? "bg-background" : "bg-muted"}
                            disabled={!isEditing}
                          />
                          <Button 
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2"
                            onClick={getCurrentLocation}
                            disabled={isLoadingLocation || !isEditing}
                          >
                            <RotateCcw className={`h-4 w-4 ${isLoadingLocation ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isEditing ? "Click the button to get your current zipcode." : "Enable editing to update your location."}
                        </p>
                      </div>

                      {/* Edit Profile Button */}
                      <div className="pt-4">
                        <Button 
                          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3"
                          onClick={handleSaveProfile}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {isEditing ? "Save" : "Edit Profile"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {activeTab === "submit" && (
                    <>
                      <MarketSearch 
                        markets={sampleMarkets}
                        onSelectMarket={handleSelectMarket}
                        onAddMarket={handleAddMarket}
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        submittedMarketName={submittedMarketName}
                      />
                      
                      {/* Vendor Application Form */}
                      <Card className="mt-8 p-8 bg-card border-border">
                        <VendorApplication />
                      </Card>
                      
                      {/* Products Section */}
                      <Card className="mt-8 p-8 bg-card border-border">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-semibold text-foreground">Products</h2>
                          <Button className="flex items-center gap-2" onClick={handleAddProduct}>
                            <Plus className="h-4 w-4" />
                            Add Product
                          </Button>
                        </div>
                        <ProductGrid products={products} />
                      </Card>
                    </>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <AddMarketForm 
        open={showAddForm} 
        onClose={handleCloseAddForm}
        onMarketAdded={handleMarketAdded}
      />
      
      <AddProductForm 
        open={showAddProductForm} 
        onClose={handleCloseAddProductForm}
        onProductAdded={handleProductAdded}
      />
    </div>
  );
};

export default Index;
