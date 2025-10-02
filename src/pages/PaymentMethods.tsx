import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { User, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function PaymentMethods() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'addresses'>('account');

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  const renderTabContent = () => {
    if (activeTab === 'account') {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Account Settings</h2>
          <p className="text-muted-foreground">Manage your account information</p>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm"><strong>Email:</strong> {user?.email}</p>
                <p className="text-sm"><strong>Name:</strong> {user?.user_metadata?.full_name || 'Not set'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Shipping Addresses</h2>
        <p className="text-muted-foreground">Manage your saved addresses</p>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No saved addresses yet</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <Card className="h-fit">
            <CardContent className="p-0">
              <nav className="flex flex-col">
                <button
                  onClick={() => setActiveTab('account')}
                  className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                    activeTab === 'account'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Account</span>
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                    activeTab === 'addresses'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span>Addresses</span>
                </button>
              </nav>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="md:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
