import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  MapPin, 
  CreditCard, 
  Plus,
  Edit2,
  Trash2,
  Check 
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  zipcode: string | null;
}

interface Address {
  id: string;
  user_id: string;
  type: 'billing' | 'shipping';
  is_default: boolean;
  full_name: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string | null;
}

export default function AccountSettings() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    zipcode: ''
  });

  const [addressForm, setAddressForm] = useState({
    type: 'shipping' as 'billing' | 'shipping',
    is_default: false,
    full_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchProfile();
      fetchAddresses();
    }
  }, [user, loading, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setProfileForm({
          full_name: data.full_name || '',
          zipcode: data.zipcode || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('user_addresses' as any)
        .select('*')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setAddresses((data as unknown as Address[]) || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profileForm.full_name,
          zipcode: profileForm.zipcode
        });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      
      fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAddress = async () => {
    if (!user) return;

    try {
      if (editingAddress) {
        // Update existing address
        const { error } = await supabase
          .from('user_addresses' as any)
          .update(addressForm)
          .eq('id', editingAddress.id);

        if (error) throw error;
      } else {
        // Create new address
        const { error } = await supabase
          .from('user_addresses' as any)
          .insert({
            user_id: user.id,
            ...addressForm
          });

        if (error) throw error;
      }

      toast({
        title: "Address saved",
        description: "Your address has been saved successfully.",
      });
      
      setShowAddressForm(false);
      setEditingAddress(null);
      resetAddressForm();
      fetchAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Error",
        description: "Failed to save address. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteAddress = async (addressId: string) => {
    try {
      const { error } = await supabase
        .from('user_addresses' as any)
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      toast({
        title: "Address deleted",
        description: "The address has been removed.",
      });
      
      fetchAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        title: "Error",
        description: "Failed to delete address. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      type: 'shipping',
      is_default: false,
      full_name: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
      phone: ''
    });
  };

  const startEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      type: address.type,
      is_default: address.is_default,
      full_name: address.full_name,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      phone: address.phone || ''
    });
    setShowAddressForm(true);
  };

  if (loading || loadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Shopping Settings</h1>
        <p className="text-muted-foreground">Manage your account information and preferences</p>
      </div>

      <Tabs defaultValue="account" orientation="vertical" className="flex flex-row gap-8">
        {/* Vertical Tab Navigation - Fixed to left */}
        <div className="w-64 flex-shrink-0">
          <Card className="sticky top-4">
            <CardContent className="p-0">
              <TabsList className="flex flex-col w-full h-auto p-0 bg-transparent">
                <TabsTrigger value="account" className="flex items-center justify-start gap-3 w-full px-6 py-4 text-left rounded-none border-b data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <User className="h-4 w-4" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="addresses" className="flex items-center justify-start gap-3 w-full px-6 py-4 text-left rounded-none border-b data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <MapPin className="h-4 w-4" />
                  Addresses
                </TabsTrigger>
                <TabsTrigger value="payment" className="flex items-center justify-start gap-3 w-full px-6 py-4 text-left rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CreditCard className="h-4 w-4" />
                  Payment
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {/* Account Tab */}
          <TabsContent value="account" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed from here
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipcode">Zip Code</Label>
                    <Input
                      id="zipcode"
                      value={profileForm.zipcode}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, zipcode: e.target.value }))}
                      placeholder="Enter your zip code"
                    />
                  </div>
                </div>

                <Separator />
                
                <div className="flex justify-end">
                  <Button onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="mt-0">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Saved Addresses</h3>
                  <p className="text-muted-foreground">Manage your shipping and billing addresses</p>
                </div>
                <Button 
                  onClick={() => {
                    resetAddressForm();
                    setEditingAddress(null);
                    setShowAddressForm(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Address
                </Button>
              </div>

              {/* Address Form */}
              {showAddressForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address_full_name">Full Name</Label>
                        <Input
                          id="address_full_name"
                          value={addressForm.full_name}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, full_name: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address_line_1">Address Line 1</Label>
                        <Input
                          id="address_line_1"
                          value={addressForm.address_line_1}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, address_line_1: e.target.value }))}
                          placeholder="Street address"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address_line_2">Address Line 2 (Optional)</Label>
                        <Input
                          id="address_line_2"
                          value={addressForm.address_line_2}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, address_line_2: e.target.value }))}
                          placeholder="Apartment, suite, etc."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={addressForm.state}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="postal_code">Postal Code</Label>
                        <Input
                          id="postal_code"
                          value={addressForm.postal_code}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, postal_code: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddress(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={saveAddress}>
                        {editingAddress ? 'Update Address' : 'Save Address'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Address List */}
              <div className="grid gap-4">
                {addresses.map((address) => (
                  <Card key={address.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{address.full_name}</h4>
                            {address.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs capitalize">
                              {address.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {address.address_line_1}
                            {address.address_line_2 && `, ${address.address_line_2}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.city}, {address.state} {address.postal_code}
                          </p>
                          {address.phone && (
                            <p className="text-sm text-muted-foreground">
                              {address.phone}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditAddress(address)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAddress(address.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {addresses.length === 0 && !showAddressForm && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No addresses saved</h3>
                      <p className="text-muted-foreground mb-4">
                        Add your shipping and billing addresses for faster checkout
                      </p>
                      <Button 
                        onClick={() => {
                          resetAddressForm();
                          setShowAddressForm(true);
                        }}
                      >
                        Add Your First Address
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Manage your saved payment methods
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Payment methods</h3>
                <p className="text-muted-foreground mb-4">
                  Payment methods are securely managed by Stripe during checkout
                </p>
                <p className="text-sm text-muted-foreground">
                  You can add and manage payment methods during your next purchase
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}