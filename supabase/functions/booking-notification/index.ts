import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { appointment_id, notification_type } = await req.json();

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

    // Email sending is temporarily disabled.
    // Log the notification as 'skipped' instead.
    const maskedEmailStr = maskEmail(email);
    const branchName = appointment.booking_branches?.name_en || "Branch";
    const dateStr = appointment.appointment_date;
    const timeStr = (appointment.start_time as string).slice(0, 5);

    await supabaseAdmin.from("notification_logs").insert({
      appointment_id,
      email_masked: maskedEmailStr,
      notification_type,
      status: "skipped",
    });

    console.log(
      `[booking-notification] ${notification_type} SKIPPED (email disabled) for appointment ${appointment_id}: ` +
      `${serviceNames} at ${branchName} on ${dateStr} ${timeStr} -> ${maskedEmailStr}`
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
