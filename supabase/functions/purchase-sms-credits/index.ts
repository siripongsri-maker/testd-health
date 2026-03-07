import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Payment Provider Abstraction ─────────────────────────────────────────────
// Each provider implements this interface. To add a new gateway (Stripe, Omise,
// PromptPay, etc.) create an adapter here that returns a CheckoutResult.

interface CheckoutResult {
  /** 'redirect' → user must visit checkout_url; 'instant' → paid immediately */
  mode: "redirect" | "instant";
  checkout_url?: string;
  payment_reference?: string;
  provider: string;
}

interface PaymentProvider {
  name: string;
  /** Return true if this provider has all required secrets configured. */
  isConfigured(): boolean;
  /** Create a checkout / charge and return result. */
  createCheckout(params: {
    purchaseId: string;
    userId: string;
    amountThb: number;
    credits: number;
    packageKey: string;
  }): Promise<CheckoutResult>;
}

// ─── Stripe Adapter (placeholder – ready for real keys) ───────────────────────
const stripeProvider: PaymentProvider = {
  name: "stripe",
  isConfigured() {
    return !!(Deno.env.get("STRIPE_SECRET_KEY") && Deno.env.get("STRIPE_WEBHOOK_SECRET"));
  },
  async createCheckout({ purchaseId, amountThb, credits, packageKey }) {
    // When real keys are set, create a Stripe Checkout Session here:
    // const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    // const session = await stripe.checkout.sessions.create({ ... });
    // return { mode: "redirect", checkout_url: session.url, provider: "stripe", payment_reference: session.id };
    throw new Error("Stripe adapter not yet implemented – add STRIPE_SECRET_KEY");
  },
};

// ─── Omise Adapter (placeholder) ──────────────────────────────────────────────
const omiseProvider: PaymentProvider = {
  name: "omise",
  isConfigured() {
    return !!(Deno.env.get("OMISE_SECRET_KEY"));
  },
  async createCheckout({ purchaseId, amountThb, credits, packageKey }) {
    throw new Error("Omise adapter not yet implemented – add OMISE_SECRET_KEY");
  },
};

// ─── Provider Registry ────────────────────────────────────────────────────────
const providers: Record<string, PaymentProvider> = {
  stripe: stripeProvider,
  omise: omiseProvider,
};

function getActiveProvider(): PaymentProvider | null {
  // Explicit override via secret
  const explicit = Deno.env.get("SMS_PAYMENT_PROVIDER");
  if (explicit && providers[explicit]?.isConfigured()) {
    return providers[explicit];
  }
  // Auto-detect first configured provider
  for (const p of Object.values(providers)) {
    if (p.isConfigured()) return p;
  }
  return null;
}

function getProviderDiagnostics() {
  return Object.fromEntries(
    Object.entries(providers).map(([key, p]) => [key, { configured: p.isConfigured() }])
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "auth_required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return json({ error: "invalid_token" }, 401);

    const body = await req.json();
    const { action, package_key, purchase_id } = body;

    // ── ACTION: provider_status (admin diagnostics) ───────────────────────────
    if (action === "provider_status") {
      // Check admin
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRole) return json({ error: "admin_required" }, 403);

      const active = getActiveProvider();
      return json({
        active_provider: active?.name ?? null,
        provider_configured: !!active,
        providers: getProviderDiagnostics(),
        sms_payment_provider_env: Deno.env.get("SMS_PAYMENT_PROVIDER") ?? null,
      });
    }

    // ── ACTION: initiate ──────────────────────────────────────────────────────
    if (action === "initiate") {
      if (!package_key || typeof package_key !== "string") {
        return json({ error: "package_key_required" }, 400);
      }

      // Validate package
      const { data: pkg } = await supabase
        .from("sms_credit_packages")
        .select("*")
        .eq("package_key", package_key)
        .eq("is_active", true)
        .single();

      if (!pkg) return json({ error: "package_not_found" }, 404);

      // Check provider availability
      const provider = getActiveProvider();
      if (!provider) {
        return json({
          status: "provider_not_configured",
          provider_configured: false,
          providers: getProviderDiagnostics(),
          message: "No payment provider is configured yet. Admin must add payment gateway credentials.",
          package: { key: pkg.package_key, credits: pkg.credits, price_thb: pkg.price_thb },
        });
      }

      // Create pending purchase record
      const { data: purchase, error: insertErr } = await supabase
        .from("sms_credit_purchases")
        .insert({
          user_id: user.id,
          package_id: pkg.id,
          package_key: pkg.package_key,
          credits: pkg.credits,
          amount_thb: pkg.price_thb,
          payment_provider: provider.name,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertErr) return json({ error: insertErr.message }, 500);

      try {
        const checkout = await provider.createCheckout({
          purchaseId: purchase!.id,
          userId: user.id,
          amountThb: Number(pkg.price_thb),
          credits: pkg.credits,
          packageKey: pkg.package_key,
        });

        // Update purchase with provider reference
        if (checkout.payment_reference) {
          await supabase
            .from("sms_credit_purchases")
            .update({ payment_reference: checkout.payment_reference, updated_at: new Date().toISOString() })
            .eq("id", purchase!.id);
        }

        if (checkout.mode === "instant") {
          // Provider charged instantly — complete purchase
          const { data: completeResult, error: completeErr } = await supabase.rpc(
            "complete_sms_purchase",
            { p_purchase_id: purchase!.id, p_payment_reference: checkout.payment_reference }
          );

          if (completeErr) {
            await supabase
              .from("sms_credit_purchases")
              .update({ status: "failed", updated_at: new Date().toISOString() })
              .eq("id", purchase!.id);
            return json({ status: "failed", error: completeErr.message }, 500);
          }

          return json({
            status: "completed",
            purchase_id: purchase!.id,
            credits_added: pkg.credits,
            balance: (completeResult as any)?.balance,
            provider: provider.name,
          });
        }

        // Redirect mode — user must complete payment externally
        return json({
          status: "pending",
          purchase_id: purchase!.id,
          checkout_url: checkout.checkout_url,
          provider: provider.name,
        });
      } catch (providerErr: any) {
        // Provider call failed — mark purchase failed
        await supabase
          .from("sms_credit_purchases")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", purchase!.id);

        return json({
          status: "failed",
          error: providerErr.message,
          provider: provider.name,
        }, 500);
      }
    }

    // ── ACTION: status ────────────────────────────────────────────────────────
    if (action === "status") {
      if (!purchase_id) return json({ error: "purchase_id_required" }, 400);

      const { data: purchase } = await supabase
        .from("sms_credit_purchases")
        .select("*")
        .eq("id", purchase_id)
        .eq("user_id", user.id)
        .single();

      if (!purchase) return json({ error: "purchase_not_found" }, 404);
      return json({ status: purchase.status, purchase });
    }

    // ── ACTION: webhook_complete (called by payment provider webhook) ─────────
    // In production, the webhook endpoint would verify the provider signature,
    // then call this with the purchase_id and payment_reference.
    if (action === "webhook_complete") {
      // This action should only be called server-side or from a verified webhook.
      // For now, require admin role as a safety check.
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRole) return json({ error: "admin_required" }, 403);
      if (!purchase_id) return json({ error: "purchase_id_required" }, 400);

      const payment_reference = body.payment_reference;

      const { data: completeResult, error: completeErr } = await supabase.rpc(
        "complete_sms_purchase",
        { p_purchase_id: purchase_id, p_payment_reference: payment_reference }
      );

      if (completeErr) return json({ error: completeErr.message, status: "failed" }, 500);
      return json({ status: "completed", result: completeResult });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
