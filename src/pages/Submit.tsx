import { useState, useEffect } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SubmitContent } from "@/components/SubmitContent";

const Submit = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <AuthForm onSuccess={() => {
          toast({
            title: "Welcome!",
            description: "You've successfully signed in.",
          });
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Submit Your Farmers Market</h1>
            <p className="text-muted-foreground">Apply to become a vendor at local farmers markets</p>
          </div>
          <SubmitContent user={user} />
        </div>
      </div>
    </div>
  );
};

export default Submit;
