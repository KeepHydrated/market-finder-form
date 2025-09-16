import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

export default function Test() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4 mb-8">
            <Label htmlFor="market-search" className="text-lg font-medium text-foreground">
              Which farmers market do you want to join? *
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                id="market-search"
                type="text"
                placeholder="Search for a farmers market..."
                className="pl-10 py-6 text-base border-2 rounded-xl bg-background/50 border-border/50 focus:border-primary focus:bg-background"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}