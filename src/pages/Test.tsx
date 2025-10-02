import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import PaymentMethodsSection from "@/components/settings/PaymentMethodsSection";

const Test = () => {
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

export default Test;

