import React from 'react';
import { TestTube } from 'lucide-react';

export default function Test() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <TestTube className="w-8 h-8 text-primary mr-3" />
              <h1 className="text-4xl font-bold text-foreground">Test Page</h1>
            </div>
            <p className="text-xl text-muted-foreground">
              A testing environment for development and debugging
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}