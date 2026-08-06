import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.slice(0, 3) + "***";
  return `${maskedLocal}@${domain}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { appointment_id, notification_type, guest_token } = await req.json();
    const authHeader = req.headers.get("Authorization");

    if (!appointment_id || !notification_type) {
      return new Response(
        JSON.stringify({ error: "Missing appointment_id or notification_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["booking_created", "booking_cancelled"].includes(notification_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid notification_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch appointment details
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from("appointments")
      .select(`
        *,
        booking_branches(name_th, name_en),
        booking_services(name_th, name_en)
      `)
      .eq("id", appointment_id)
      .single();

    if (aptError || !appointment) {
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ownership check: caller must either be the authenticated owner of the
    // appointment, or present a guest token whose hash matches the stored one.
    let owns = false;
    if (authHeader) {
      try {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await userClient.auth.getUser();
        if (user && appointment.user_id && user.id === appointment.user_id) owns = true;
      } catch { /* ignore */ }
    }
    if (!owns && guest_token && appointment.guest_access_hash) {
      const hashed = await sha256Hex(guest_token);
      const notExpired = !appointment.guest_access_expires_at ||
        new Date(appointment.guest_access_expires_at) > new Date();
      if (hashed === appointment.guest_access_hash && notExpired) owns = true;
    }

    if (!owns) {
      return new Response(
        JSON.stringify({ error: "forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get multi-service info
    const { data: services } = await supabaseAdmin
      .from("appointment_services")
      .select("booking_services(name_en, name_th)")
      .eq("appointment_id", appointment_id);

    const serviceNames = (services || [])
      .map((s: any) => s.booking_services?.name_en)
      .filter(Boolean)
      .join(", ") || appointment.booking_services?.name_en || "Service";

    // Determine email
    let email = appointment.contact_email;
    if (!email && appointment.user_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(appointment.user_id);
      email = userData?.user?.email;
    }

    if (!email) {
      // Log as no_email
      await supabaseAdmin.from("notification_logs").insert({
        appointment_id,
        email_masked: "no_email",
        notification_type,
        status: "skipped_no_email",
      });

      return new Response(
        JSON.stringify({ success: true, message: "No email available, notification skipped" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const maskedEmailStr = maskEmail(email);
    const branchName = appointment.booking_branches?.name_en || "Branch";
    const dateStr = appointment.appointment_date;
    const timeStr = (appointment.start_time as string).slice(0, 5);
    const referralCode = appointment.referral_code || "";

    // Build magic link if token was provided
    const appUrl = Deno.env.get("APP_URL") || "https://testd-health.lovable.app";
    const magicLink = guest_token ? `${appUrl}/guest-appointments?token=${guest_token}` : null;

    await supabaseAdmin.from("notification_logs").insert({
      appointment_id,
      email_masked: maskedEmailStr,
      notification_type,
      status: "skipped",
    });

    console.log(
      `[booking-notification] ${notification_type} SKIPPED (email disabled) for appointment ${appointment_id}: ` +
      `${serviceNames} at ${branchName} on ${dateStr} ${timeStr} -> ${maskedEmailStr}` +
      (magicLink ? ` | Magic link: ${magicLink}` : "") +
      (referralCode ? ` | Referral: ${referralCode}` : "")
    );

    return new Response(
      JSON.stringify({
        success: true,
        notification_type,
        email_masked: maskedEmailStr,
        status: "skipped",
        details: `${serviceNames} at ${branchName} on ${dateStr} at ${timeStr}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
