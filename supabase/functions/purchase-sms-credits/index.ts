import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "auth_required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, package_key, purchase_id } = body;

    // ACTION: initiate — create pending purchase
    if (action === "initiate") {
      if (!package_key || typeof package_key !== "string") {
        return new Response(JSON.stringify({ error: "package_key_required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create pending purchase via RPC
      const { data, error } = await supabase.rpc("create_sms_purchase", {
        p_package_key: package_key,
      });

      // RPC runs as security definer but we called with service role.
      // We need to set the auth context. Let's do it directly instead.
      const { data: pkg } = await supabase
        .from("sms_credit_packages")
        .select("*")
        .eq("package_key", package_key)
        .eq("is_active", true)
        .single();

      if (!pkg) {
        return new Response(JSON.stringify({ error: "package_not_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: purchase, error: insertErr } = await supabase
        .from("sms_credit_purchases")
        .insert({
          user_id: user.id,
          package_id: pkg.id,
          package_key: pkg.package_key,
          credits: pkg.credits,
          amount_thb: pkg.price_thb,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- Payment Provider Abstraction ---
      // Check if a payment provider is configured
      const paymentProvider = Deno.env.get("SMS_PAYMENT_PROVIDER"); // e.g. "stripe", "omise", "placeholder"

      if (!paymentProvider || paymentProvider === "placeholder") {
        // No real payment provider — auto-complete for sponsored/demo mode
        // In production, this should redirect to a real checkout
        const { data: completeResult, error: completeErr } = await supabase.rpc(
          "complete_sms_purchase",
          { p_purchase_id: purchase!.id }
        );

        if (completeErr) {
          // Mark purchase failed
          await supabase
            .from("sms_credit_purchases")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("id", purchase!.id);

          return new Response(
            JSON.stringify({ error: completeErr.message, status: "failed" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({
            status: "completed",
            purchase_id: purchase!.id,
            credits_added: pkg.credits,
            balance: (completeResult as any)?.balance,
            provider: "demo",
            message: "Credits added instantly (demo mode)",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // --- Real payment provider integration point ---
      // For Stripe/Omise/etc, create a checkout session here and return the URL
      // The webhook would then call complete_sms_purchase on success
      return new Response(
        JSON.stringify({
          status: "pending",
          purchase_id: purchase!.id,
          checkout_url: null, // Would be set by real provider
          provider: paymentProvider,
          message: "Payment provider checkout would redirect here",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ACTION: status — check purchase status
    if (action === "status") {
      if (!purchase_id) {
        return new Response(JSON.stringify({ error: "purchase_id_required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: purchase } = await supabase
        .from("sms_credit_purchases")
        .select("*")
        .eq("id", purchase_id)
        .eq("user_id", user.id)
        .single();

      if (!purchase) {
        return new Response(JSON.stringify({ error: "purchase_not_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ status: purchase.status, purchase }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "invalid_action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
