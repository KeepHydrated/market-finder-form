import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentMethodId } = await req.json();
    
    if (!paymentMethodId) {
      throw new Error("Payment method ID is required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2025-08-27.basil",
      httpClient: Stripe.createFetchHttpClient(),
    });

    console.log("Retrieving payment method:", paymentMethodId);
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    console.log("Payment method retrieved:", paymentMethod);

    return new Response(
      JSON.stringify({
        brand: paymentMethod.card?.brand || "card",
        last4: paymentMethod.card?.last4 || "****",
        exp_month: paymentMethod.card?.exp_month?.toString() || "01",
        exp_year: paymentMethod.card?.exp_year?.toString() || "2099",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error retrieving payment method:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
