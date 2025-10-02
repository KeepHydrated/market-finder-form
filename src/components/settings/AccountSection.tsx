import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AccountSectionProps {
  formData: {
    email: string;
    newEmail: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    email: string;
    newEmail: string;
  }>>;
  isSaving: boolean;
  onEmailUpdate: () => void;
  onPasswordReset: () => void;
}

export default function AccountSection({ 
  formData, 
  setFormData, 
  isSaving, 
  onEmailUpdate, 
  onPasswordReset 
}: AccountSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
          <CardDescription>
            Update your email address or reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-email">Current Email</Label>
            <Input
              id="current-email"
              type="email"
              value={formData.email}
              disabled
              className="bg-muted"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-email">New Email</Label>
            <Input
              id="new-email"
              type="email"
              value={formData.newEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, newEmail: e.target.value }))}
              placeholder="Enter new email address"
            />
          </div>
          
          <Button 
            onClick={onEmailUpdate} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Email'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Reset your password via email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={onPasswordReset} 
            disabled={isSaving}
            variant="outline"
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Password Reset Email'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
