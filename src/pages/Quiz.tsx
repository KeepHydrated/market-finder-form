import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { User, Store, Bell, CreditCard, MapPin, Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import PaymentMethodsSection from "@/components/settings/PaymentMethodsSection";

const Quiz = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('payment');
  const { toast } = useToast();

  // Local state for form inputs
  const [formData, setFormData] = useState({
    email: '',
    newEmail: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  // Update form data when profile loads
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleTabClick = (tabName: string) => {
    setActiveTab(tabName);
  };

  const handleEmailUpdate = async () => {
    if (!formData.newEmail || formData.newEmail === formData.email) {
      toast({
        title: "Error",
        description: "Please enter a new email address",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: formData.newEmail
      });

      if (error) throw error;

      toast({
        title: "Confirmation Email Sent",
        description: "Please check both your current and new email addresses to confirm the change.",
      });
      
      setFormData(prev => ({ ...prev, newEmail: '' }));
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send confirmation email",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      toast({
        title: "Error",
        description: "No email address found",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for instructions to reset your password.",
      });
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.admin.deleteUser(user!.id);
      
      if (error) throw error;

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      
      // User will be automatically logged out due to auth state change
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left sidebar with tabs */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <nav className="mt-2">
          <ul className="space-y-1">
            <li>
              <button
                className={`w-full flex items-center px-4 py-2 text-sm font-medium text-left ${
                  activeTab === 'payment' 
                    ? 'bg-gray-100 text-gray-900 border-r-2 border-blue-500' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => handleTabClick('payment')}
              >
                <CreditCard className="h-5 w-5 mr-3" />
                Payment Methods
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-8">
        {activeTab === 'payment' && <PaymentMethodsSection />}
      </div>
    </div>
  );
};

export default Quiz;
