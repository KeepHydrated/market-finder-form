import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestTube, Code, CheckCircle, AlertCircle } from 'lucide-react';

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

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="w-5 h-5 mr-2" />
                  Component Testing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Test UI components and their interactions
                </p>
                <Badge variant="secondary">Active</Badge>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  API Testing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Test backend functionality and data flow
                </p>
                <Badge variant="outline">Ready</Badge>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                  Debug Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Debug and troubleshoot application issues
                </p>
                <Badge variant="destructive">Development</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Test Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Test Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => console.log('Test button clicked!')}>
                  Console Test
                </Button>
                <Button variant="outline" onClick={() => alert('Test alert!')}>
                  Alert Test
                </Button>
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Environment</p>
                  <Badge variant="outline">Development</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">User Agent</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {navigator.userAgent.substring(0, 50)}...
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Screen Size</p>
                  <p className="text-sm text-muted-foreground">
                    {window.innerWidth} × {window.innerHeight}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}