import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutItem {
  product_name: string;
  product_description?: string;
  unit_price: number; // in cents
  quantity: number;
}

interface PaymentRequest {
  items: CheckoutItem[];
  vendor_id: string;
  vendor_name: string;
  customer_email?: string; // for guest checkout
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { items, vendor_id, vendor_name, customer_email }: PaymentRequest = await req.json();
    if (!items?.length) throw new Error("No items provided");

    logStep("Processing payment request", { itemCount: items.length, vendor_id });

    // Check if user is authenticated (optional for guest checkout)
    let user = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      user = userData.user;
      logStep("User authenticated", { userId: user?.id, email: user?.email });
    }

    // Determine customer email
    const finalCustomerEmail = user?.email || customer_email;
    if (!finalCustomerEmail) {
      throw new Error("Customer email is required for checkout");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: finalCustomerEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: finalCustomerEmail,
        name: user?.user_metadata?.full_name || undefined,
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    logStep("Calculated total", { totalAmount });

    // Create order in database
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user?.id || null,
        email: finalCustomerEmail,
        total_amount: totalAmount,
        status: 'pending',
        vendor_id,
        vendor_name
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);
    logStep("Created order", { orderId: order.id });

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_name: item.product_name,
      product_description: item.product_description || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity
    }));

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw new Error(`Failed to create order items: ${itemsError.message}`);
    logStep("Created order items", { count: orderItems.length });

    // Create commission record for nadiachibri@gmail.com (3% commission)
    const commissionEmail = "nadiachibri@gmail.com";
    const commissionRate = 0.03; // 3%
    const commissionAmount = Math.round(totalAmount * commissionRate);
    
    const { error: commissionError } = await supabaseClient
      .from('commissions')
      .insert({
        order_id: order.id,
        commission_email: commissionEmail,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        order_total: totalAmount,
        vendor_id,
        vendor_name
      });

    if (commissionError) {
      logStep("Failed to create commission record", { error: commissionError.message });
      // Don't fail the checkout if commission tracking fails
    } else {
      logStep("Created commission record", { commissionAmount, commissionEmail });
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      customer: customerId,
      metadata: {
        order_id: order.id,
        vendor_id,
        vendor_name
      },
      receipt_email: finalCustomerEmail,
    });

    // Update order with Payment Intent ID
    await supabaseClient
      .from('orders')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', order.id);

    logStep("Created payment intent", { paymentIntentId: paymentIntent.id });

    return new Response(JSON.stringify({ 
      client_secret: paymentIntent.client_secret,
      order_id: order.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-payment-intent", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});