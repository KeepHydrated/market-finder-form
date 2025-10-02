import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ShippingAddressesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Addresses</CardTitle>
        <CardDescription>
          Manage your saved shipping addresses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Shipping addresses section coming soon...</p>
      </CardContent>
    </Card>
  );
}
