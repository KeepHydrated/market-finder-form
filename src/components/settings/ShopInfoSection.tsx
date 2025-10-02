import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ShopInfoSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Information</CardTitle>
        <CardDescription>
          Manage your shop details and settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Shop information section coming soon...</p>
      </CardContent>
    </Card>
  );
}
