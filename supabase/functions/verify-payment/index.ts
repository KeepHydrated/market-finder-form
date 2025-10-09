import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    logStep("Verifying payment for session", { session_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Retrieved session", { 
      status: session.payment_status, 
      amount: session.amount_total 
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Update order status based on payment status
    let newStatus = 'pending';
    if (session.payment_status === 'paid') {
      newStatus = 'paid';
    }

    const { data: order, error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        status: newStatus,
        stripe_payment_intent_id: session.payment_intent as string
      })
      .eq('stripe_checkout_session_id', session_id)
      .select()
      .single();

    if (updateError) {
      logStep("Error updating order", { error: updateError.message });
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    logStep("Order updated", { orderId: order.id, newStatus });

    return new Response(JSON.stringify({ 
      success: true,
      payment_status: session.payment_status,
      order_status: newStatus,
      order
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
