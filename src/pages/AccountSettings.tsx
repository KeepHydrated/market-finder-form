import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Check,
  Upload,
  Edit,
  RotateCcw
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
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

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  vendor_name: string;
}

export default function AccountSettings() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('account');

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditingProfilePic, setIsEditingProfilePic] = useState(false);
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<any[]>([]);
  const [loadingSavedPaymentMethods, setLoadingSavedPaymentMethods] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<any>(null);

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    avatar_url: ''
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

    // Handle tab parameter from URL
    const tabParam = searchParams.get('tab');
    if (tabParam && ['account', 'addresses', 'payments'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    if (user && profile) {
      console.log('Profile data loaded:', profile);
      setProfileForm({
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || ''
      });
      setLoadingProfile(false);
    }
    
    if (user) {
      fetchAddresses();
      fetchOrders();
      fetchSavedPaymentMethods();
      initStripe();
    }
  }, [user, profile, loading, navigate, searchParams]);

  const initStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-key');
      if (error) throw error;
      if (data?.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey));
      }
    } catch (error) {
      console.error('Failed to load Stripe:', error);
    }
  };

  // Add a manual refresh function
  const refreshProfileData = async () => {
    console.log('Manually refreshing profile...');
    if (refreshProfile) {
      await refreshProfile();
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
    if (!user) {
      console.log('No user found, cannot save profile');
      return;
    }

    console.log('Starting profile save...');
    console.log('Profile form data:', {
      full_name: profileForm.full_name,
      avatar_url: profileForm.avatar_url ? 'Present (' + profileForm.avatar_url.length + ' chars)' : 'null'
    });

    setSavingProfile(true);
    try {
      // Check if avatar_url is a base64 string and clear it if so
      let avatarUrl = profileForm.avatar_url;
      if (avatarUrl && avatarUrl.startsWith('data:image/')) {
        console.log('Detected base64 image, clearing avatar_url');
        avatarUrl = null; // Clear base64 data
        setProfileForm(prev => ({ ...prev, avatar_url: null }));
      }

      console.log('Saving to database with:', {
        user_id: user.id,
        full_name: profileForm.full_name,
        avatar_url: avatarUrl
      });

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profileForm.full_name,
          avatar_url: avatarUrl
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Profile saved successfully to database');

      // Refresh profile data in the auth context
      if (refreshProfile) {
        console.log('Refreshing auth context...');
        await refreshProfile();
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      
      // Exit all edit modes
      setIsEditingProfilePic(false);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: `Failed to save profile: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      try {
        console.log('Starting file upload...');
        
        // Upload to Supabase storage using the avatars bucket
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.error('Storage upload error:', error);
          throw error;
        }

        console.log('Upload successful:', data);

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        console.log('Public URL:', publicUrl);

        setProfileForm(prev => ({
          ...prev,
          avatar_url: publicUrl
        }));

        toast({
          title: "Image uploaded",
          description: "Profile picture uploaded successfully.",
        });
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: "Upload failed",
          description: "Failed to upload image. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Clear profile avatar
  const clearAvatar = async () => {
    try {
      setProfileForm(prev => ({ ...prev, avatar_url: null }));
      
      toast({
        title: "Avatar cleared",
        description: "Profile picture has been removed.",
      });
    } catch (error) {
      console.error('Error clearing avatar:', error);
      toast({
        title: "Error",
        description: "Failed to clear avatar.",
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No email address found.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/account`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your email for a password reset link.",
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
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

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchSavedPaymentMethods = async () => {
    if (!user) return;
    
    console.log('Fetching saved payment methods for user:', user.id);
    setLoadingSavedPaymentMethods(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
      }
      
      console.log('Fetched payment methods:', data);
      setSavedPaymentMethods(data || []);
      
      // Automatically set the first/default payment method for editing to populate the form
      if (data && data.length > 0 && !editingPaymentMethod) {
        setEditingPaymentMethod(data[0]);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoadingSavedPaymentMethods(false);
    }
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethodId);

      if (error) throw error;

      toast({
        title: "Payment method deleted",
        description: "The payment method has been removed.",
      });
      
      fetchSavedPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment method. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  function PaymentMethodForm() {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [setAsDefault, setSetAsDefault] = useState(false);
    const [paymentType, setPaymentType] = useState('credit-debit');
    const [isEditMode, setIsEditMode] = useState(!editingPaymentMethod);
    const [bankData, setBankData] = useState({
      bankName: '',
      accountHolderName: '',
      routingNumber: '',
      accountNumber: '',
    });
    const [paypalData, setPaypalData] = useState({
      email: '',
      accountName: '',
    });

    // Load editing payment method data
    useEffect(() => {
      if (editingPaymentMethod) {
        setPaymentType(editingPaymentMethod.payment_type);
        setSetAsDefault(editingPaymentMethod.is_default);
        setIsEditMode(false); // Start in view mode when editing
        
        if (editingPaymentMethod.payment_type === 'bank') {
          setBankData({
            bankName: editingPaymentMethod.bank_name || '',
            accountHolderName: editingPaymentMethod.account_holder_name || '',
            routingNumber: editingPaymentMethod.routing_number || '',
            accountNumber: editingPaymentMethod.account_number_last_4 || '',
          });
        } else if (editingPaymentMethod.payment_type === 'paypal') {
          setPaypalData({
            email: editingPaymentMethod.paypal_email || '',
            accountName: editingPaymentMethod.paypal_account_name || '',
          });
        }
      } else {
        setIsEditMode(true); // Start in edit mode when adding new
      }
    }, [editingPaymentMethod]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          toast({
            title: "Authentication Required",
            description: "Please log in to add a payment method.",
            variant: "destructive",
          });
          return;
        }

        if (editingPaymentMethod) {
          // If payment type changed, treat as new addition instead of update
          if (editingPaymentMethod.payment_type !== paymentType && paymentType === 'credit-debit') {
            // Delete the old payment method
            const { error: deleteError } = await supabase
              .from('payment_methods')
              .delete()
              .eq('id', editingPaymentMethod.id);

            if (deleteError) throw deleteError;

            // Clear editing state to proceed with adding new card
            setEditingPaymentMethod(null);
            
            // Now proceed with adding the new credit card below
          } else if (paymentType === 'credit-debit') {
            // If setting as default, unset default on all other payment methods first
            if (setAsDefault) {
              const { error: updateError } = await supabase
                .from('payment_methods')
                .update({ is_default: false })
                .eq('user_id', authUser.id)
                .neq('id', editingPaymentMethod.id);
              
              if (updateError) {
                console.error('Error unsetting other defaults:', updateError);
                throw updateError;
              }
            }

            // For credit cards, only update the default flag (card details cannot be changed)
            const { error: dbError } = await supabase
              .from('payment_methods')
              .update({
                is_default: setAsDefault,
              })
              .eq('id', editingPaymentMethod.id);

            if (dbError) {
              console.error('Database error:', dbError);
              throw new Error(`Failed to update card: ${dbError.message}`);
            }

            toast({
              title: "Success",
              description: "Payment method updated successfully.",
            });
            
            await fetchSavedPaymentMethods();
            return;

          } else {
            // If setting as default, unset default on all other payment methods first
            if (setAsDefault) {
              const { error: updateError } = await supabase
                .from('payment_methods')
                .update({ is_default: false })
                .eq('user_id', authUser.id)
                .neq('id', editingPaymentMethod.id);
              
              if (updateError) {
                console.error('Error unsetting other defaults:', updateError);
                throw updateError;
              }
            }

            // Handle bank and PayPal updates
            let updateData: any = {
              is_default: setAsDefault,
            };

            if (paymentType === 'bank') {
              updateData = {
                ...updateData,
                payment_type: 'bank',
                bank_name: bankData.bankName,
                account_holder_name: bankData.accountHolderName,
                routing_number: bankData.routingNumber,
                account_number_last_4: bankData.accountNumber.slice(-4),
                // Clear out other payment type fields
                card_brand: null,
                last_4_digits: null,
                exp_month: null,
                exp_year: null,
                paypal_email: null,
                paypal_account_name: null,
              };
            } else if (paymentType === 'paypal') {
              updateData = {
                ...updateData,
                payment_type: 'paypal',
                paypal_email: paypalData.email,
                paypal_account_name: paypalData.accountName,
                // Clear out other payment type fields
                card_brand: null,
                last_4_digits: null,
                exp_month: null,
                exp_year: null,
                bank_name: null,
                account_holder_name: null,
                routing_number: null,
                account_number_last_4: null,
              };
            }

            const { error: dbError } = await supabase
              .from('payment_methods')
              .update(updateData)
              .eq('id', editingPaymentMethod.id);

            if (dbError) throw dbError;

            toast({
              title: "Success",
              description: "Payment method updated successfully.",
            });
            
            await fetchSavedPaymentMethods();
            return;
          }
        }

        // Add new payment method
        {
          // Check for duplicates before adding
          const isDuplicate = savedPaymentMethods.some(method => {
            if (paymentType === 'paypal' && method.payment_type === 'paypal') {
              return method.paypal_email === paypalData.email;
            }
            if (paymentType === 'bank' && method.payment_type === 'bank') {
              return method.routing_number === bankData.routingNumber && 
                     method.account_number_last_4 === bankData.accountNumber.slice(-4);
            }
            return false;
          });

          if (isDuplicate) {
            toast({
              title: "Duplicate Payment Method",
              description: "This payment method already exists.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }

          // If setting as default, unset default on all other payment methods first
          if (setAsDefault) {
            const { error: updateError } = await supabase
              .from('payment_methods')
              .update({ is_default: false })
              .eq('user_id', authUser.id);
            
            if (updateError) {
              console.error('Error unsetting other defaults:', updateError);
              throw updateError;
            }
          }

          // Add new payment method
          if (paymentType === 'credit-debit') {
            // Handle Stripe card payment
            if (!stripe || !elements) {
              throw new Error('Stripe not loaded');
            }

            console.log('Creating setup intent for new card...');
            const { data: setupData, error: setupError } = await supabase.functions.invoke('create-setup-intent');
            if (setupError) {
              console.error('Setup intent error:', setupError);
              throw new Error(`Setup intent failed: ${setupError.message}`);
            }
            console.log('Setup intent created:', setupData);

            const cardElement = elements.getElement(CardElement);
            if (!cardElement) throw new Error('Card element not found');

            console.log('Confirming card setup...');
            const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(
              setupData.client_secret,
              {
                payment_method: {
                  card: cardElement,
                },
              }
            );

            if (stripeError) {
              console.error('Stripe error:', stripeError);
              setIsLoading(false);
              toast({
                title: "Card Validation Error",
                description: stripeError.message || "Please check your card details and try again.",
                variant: "destructive",
              });
              return;
            }
            console.log('Card setup confirmed:', setupIntent);

            if (!setupIntent) {
              throw new Error('No setup intent returned from Stripe');
            }

            // Get payment method ID
            const paymentMethodId = typeof setupIntent.payment_method === 'string' 
              ? setupIntent.payment_method 
              : setupIntent.payment_method?.id;

            if (!paymentMethodId) {
              throw new Error('No payment method ID in setup intent');
            }

            console.log('Fetching payment method details from server...');
            // Fetch the actual card details from the server
            const { data: cardDetails, error: cardError } = await supabase.functions.invoke(
              'get-payment-method-details',
              { body: { paymentMethodId } }
            );

            console.log('Raw response from edge function:', { cardDetails, cardError });

            if (cardError) {
              console.error('Failed to get card details:', cardError);
              throw new Error(`Failed to get card details: ${cardError.message}`);
            }

            if (!cardDetails) {
              console.error('No card details in response');
              throw new Error('No card details received from server');
            }
            
            console.log('Card details received:', cardDetails);
            console.log('Card brand:', cardDetails.brand);
            console.log('Last 4:', cardDetails.last4);
            console.log('Exp month:', cardDetails.exp_month);
            console.log('Exp year:', cardDetails.exp_year);

            const insertData = {
              user_id: authUser.id,
              payment_type: 'credit-debit',
              card_brand: cardDetails.brand || 'unknown',
              last_4_digits: cardDetails.last4 || '0000',
              exp_month: cardDetails.exp_month?.toString() || '01',
              exp_year: cardDetails.exp_year?.toString() || '2099',
              is_default: setAsDefault,
            };
            
            console.log('Inserting into database:', insertData);

            const { error: dbError } = await supabase
              .from('payment_methods')
              .insert(insertData);

            if (dbError) {
              console.error('Database error:', dbError);
              throw new Error(`Failed to save card: ${dbError.message}`);
            }

          } else if (paymentType === 'bank') {
            // Handle bank account
            const { error: dbError } = await supabase
              .from('payment_methods')
              .insert({
                user_id: authUser.id,
                payment_type: 'bank',
                bank_name: bankData.bankName,
                account_holder_name: bankData.accountHolderName,
                routing_number: bankData.routingNumber,
                account_number_last_4: bankData.accountNumber.slice(-4),
                is_default: setAsDefault,
              });

            if (dbError) throw dbError;

          } else if (paymentType === 'paypal') {
            // Handle PayPal
            const { error: dbError } = await supabase
              .from('payment_methods')
              .insert({
                user_id: authUser.id,
                payment_type: 'paypal',
                paypal_email: paypalData.email,
                paypal_account_name: paypalData.accountName,
                is_default: setAsDefault,
              });

            if (dbError) throw dbError;
          }

          toast({
            title: "Success",
            description: "Payment method added successfully.",
          });
        }

        // Refresh saved payment methods and reset form
        await fetchSavedPaymentMethods();
        
        // Clear Stripe CardElement if it exists
        if (elements) {
          const cardElement = elements.getElement(CardElement);
          if (cardElement) {
            cardElement.clear();
          }
        }
        
        // Reset form to allow adding another payment method
        setEditingPaymentMethod(null);
        setPaymentType('credit-debit');
        setSetAsDefault(false);
        
        // Reset form data
        setBankData({
          bankName: '',
          accountHolderName: '',
          routingNumber: '',
          accountNumber: '',
        });
        setPaypalData({
          email: '',
          accountName: '',
        });
        
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to add payment method.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="payment-type" className="text-base font-semibold">Payment Type</Label>
          <Select value={paymentType} onValueChange={setPaymentType}>
            <SelectTrigger className="w-full h-12 text-base border-2 rounded-xl">
              <SelectValue placeholder="Select payment type" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="credit-debit" className="text-base py-3">Credit/Debit Card</SelectItem>
              <SelectItem value="bank" className="text-base py-3">Bank Account</SelectItem>
              <SelectItem value="paypal" className="text-base py-3">PayPal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentType === 'credit-debit' && (
          <div className="space-y-2">
            <Label className="text-base font-semibold">Card Information</Label>
            {editingPaymentMethod && editingPaymentMethod.payment_type === 'credit-debit' ? (
              <div className="p-4 border-2 rounded-xl bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium capitalize">{editingPaymentMethod.card_brand}</span>
                    <span className="text-muted-foreground">•••• •••• •••• {editingPaymentMethod.last_4_digits}</span>
                  </div>
                  <span className="text-muted-foreground">{editingPaymentMethod.exp_month}/{editingPaymentMethod.exp_year}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 border-2 rounded-xl">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                      invalid: {
                        color: '#9e2146',
                      },
                    },
                  }}
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {editingPaymentMethod 
                ? "Card details cannot be changed for security. Delete and add a new card to replace."
                : "Your card details are securely processed by Stripe with full autofill support"
              }
            </p>
          </div>
        )}

        {paymentType === 'bank' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="bank-name" className="text-base font-semibold">Bank Name</Label>
              <Input
                id="bank-name"
                placeholder="Enter bank name"
                value={bankData.bankName}
                onChange={(e) => setBankData(prev => ({ ...prev, bankName: e.target.value }))}
                className="h-12 text-base border-2 rounded-xl"
                disabled={!isEditMode}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-holder" className="text-base font-semibold">Account Holder Name</Label>
              <Input
                id="account-holder"
                placeholder="Enter account holder name"
                value={bankData.accountHolderName}
                onChange={(e) => setBankData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                className="h-12 text-base border-2 rounded-xl"
                autoComplete="name"
                disabled={!isEditMode}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="routing-number" className="text-base font-semibold">Routing Number</Label>
              <Input
                id="routing-number"
                placeholder="Enter routing number"
                value={bankData.routingNumber}
                onChange={(e) => setBankData(prev => ({ ...prev, routingNumber: e.target.value }))}
                className="h-12 text-base border-2 rounded-xl"
                disabled={!isEditMode}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-number" className="text-base font-semibold">Account Number</Label>
              <Input
                id="account-number"
                placeholder="Enter account number"
                value={bankData.accountNumber}
                onChange={(e) => setBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
                className="h-12 text-base border-2 rounded-xl"
                disabled={!isEditMode}
                required
              />
            </div>
          </>
        )}

        {paymentType === 'paypal' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="paypal-email" className="text-base font-semibold">PayPal Email</Label>
              <Input
                id="paypal-email"
                type="email"
                placeholder="Enter PayPal email address"
                value={paypalData.email}
                onChange={(e) => setPaypalData(prev => ({ ...prev, email: e.target.value }))}
                className="h-12 text-base border-2 rounded-xl"
                autoComplete="email"
                disabled={!isEditMode}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paypal-name" className="text-base font-semibold">Account Name</Label>
              <Input
                id="paypal-name"
                placeholder="Enter PayPal account name"
                value={paypalData.accountName}
                onChange={(e) => setPaypalData(prev => ({ ...prev, accountName: e.target.value }))}
                className="h-12 text-base border-2 rounded-xl"
                autoComplete="name"
                disabled={!isEditMode}
                required
              />
            </div>
          </>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="default"
            checked={setAsDefault}
            onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
            disabled={paymentType !== 'credit-debit' && !isEditMode}
          />
          <Label htmlFor="default" className="text-base font-normal cursor-pointer">
            Set as default payment method
          </Label>
        </div>

        {editingPaymentMethod && !isEditMode && paymentType !== 'credit-debit' ? (
          <Button 
            type="button"
            className="w-full h-12 text-base rounded-xl"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditMode(true);
            }}
          >
            Edit
          </Button>
        ) : (
          <Button 
            type="submit"
            className="w-full h-12 text-base rounded-xl bg-teal-500 hover:bg-teal-600"
            disabled={isLoading || (paymentType === 'credit-debit' && !stripe)}
          >
            {isLoading ? "Saving..." : editingPaymentMethod ? "Save Changes" : "Add Payment Method"}
          </Button>
        )}
      </form>
    );
  }

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

      <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex flex-row gap-8">
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
                <TabsTrigger value="payments" className="flex items-center justify-start gap-3 w-full px-6 py-4 text-left rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CreditCard className="h-4 w-4" />
                  Payments
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {/* Account Tab */}
          <TabsContent value="account" className="mt-0">
            <div className="space-y-8">
              {/* Profile Picture */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">Profile Picture</CardTitle>
                    <CardDescription>Upload and manage your profile picture</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {isEditingProfilePic ? (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setProfileForm(prev => ({ ...prev, avatar_url: originalAvatarUrl }));
                            setIsEditingProfilePic(false);
                          }}
                        >
                          Cancel
                        </Button>
                         <Button 
                           size="sm" 
                           onClick={async () => {
                             await saveProfile();
                             setIsEditingProfilePic(false);
                           }}
                           disabled={savingProfile}
                         >
                          {savingProfile ? 'Saving...' : 'Save'}
                        </Button>
                      </>
                     ) : (
                       <>
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => {
                             setOriginalAvatarUrl(profileForm.avatar_url);
                             setIsEditingProfilePic(true);
                           }}
                         >
                           <Edit className="h-4 w-4 mr-2" />
                           Edit
                         </Button>
                       </>
                     )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-4">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={!isEditingProfilePic}
                      />
                      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/30 overflow-hidden">
                        {profileForm.avatar_url ? (
                          <img 
                            src={profileForm.avatar_url} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                     </div>
                     <div className="text-xs text-muted-foreground text-left">
                       JPG, PNG or GIF (max 5MB)
                     </div>
                    
                     {/* Username section */}
                     <div className="text-left space-y-2">
                       <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                       {isEditingProfilePic ? (
                         <div className="flex items-center gap-2">
                           <Input
                             id="username"
                             value={profileForm.full_name}
                             onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                             className="w-40 text-center"
                             placeholder="Enter username"
                           />
                         </div>
                       ) : (
                         <div className="text-sm font-medium">
                           {profileForm.full_name || "No username set"}
                         </div>
                       )}
                     </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
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
                        Email cannot be changed
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Password</Label>
                      <div className="flex gap-4 items-center">
                        <div className="bg-muted p-4 rounded-md flex-1 text-muted-foreground tracking-widest">
                          ••••••••••••
                        </div>
                        <Button 
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={handlePasswordReset}
                        >
                          Change Password
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">Click to receive a password reset link via email</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>
                    Once you delete your account, there is no going back. Please be certain.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="bg-red-600 hover:bg-red-700 text-white">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="mt-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Saved Addresses</h3>
                <p className="text-muted-foreground">Manage your shipping and billing addresses</p>
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

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-0">
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  {stripePromise ? (
                    <Elements stripe={stripePromise}>
                      <PaymentMethodForm />
                    </Elements>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      Loading payment form...
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}