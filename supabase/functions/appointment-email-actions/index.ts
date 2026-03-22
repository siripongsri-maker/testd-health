import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCode(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => (b % 10).toString()).join('') +
    Array.from(crypto.getRandomValues(new Uint8Array(3))).map(b => (b % 10).toString()).join('');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { action, appointment_id, code } = await req.json();

    // Action: generate — create a verification code for an appointment
    if (action === "generate") {
      if (!appointment_id) {
        return new Response(
          JSON.stringify({ error: "Missing appointment_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const verificationCode = generateCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

      const { data, error } = await supabase
        .from("appointment_action_codes")
        .insert({
          appointment_id,
          code: verificationCode,
          action_type: "multi",
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to generate code:", error);
        return new Response(
          JSON.stringify({ error: "Failed to generate verification code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, code: verificationCode, expires_at: expiresAt }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: validate — check if code is valid
    if (action === "validate") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Missing code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: codeRecord, error } = await supabase
        .from("appointment_action_codes")
        .select("*, appointments(id, status, appointment_date, start_time, branch_id, booking_branches(name_en, name_th))")
        .eq("code", code)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (error || !codeRecord) {
        return new Response(
          JSON.stringify({ valid: false, reason: !codeRecord ? "expired_or_invalid" : "error" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          valid: true,
          appointment_id: codeRecord.appointment_id,
          appointment: codeRecord.appointments,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: execute — perform the appointment action
    if (action === "execute") {
      const { appointment_action } = await req.json().catch(() => ({ appointment_action: null }));
      // Re-parse since we already consumed the body
      const body = { action, appointment_id, code, appointment_action: (await req.json().catch(() => ({}))).appointment_action };

      if (!code) {
        return new Response(
          JSON.stringify({ error: "Missing code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate code first
      const { data: codeRecord, error: codeError } = await supabase
        .from("appointment_action_codes")
        .select("*")
        .eq("code", code)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (codeError || !codeRecord) {
        return new Response(
          JSON.stringify({ success: false, reason: "expired_or_used" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check current appointment status
      const { data: apt } = await supabase
        .from("appointments")
        .select("status")
        .eq("id", codeRecord.appointment_id)
        .single();

      if (!apt) {
        return new Response(
          JSON.stringify({ success: false, reason: "appointment_not_found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark code as used
      await supabase
        .from("appointment_action_codes")
        .update({ used_at: new Date().toISOString(), used_action: appointment_id })
        .eq("id", codeRecord.id);

      return new Response(
        JSON.stringify({ success: true, appointment_id: codeRecord.appointment_id, current_status: apt.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: send_review — trigger post-service review email
    if (action === "send_review") {
      if (!appointment_id) {
        return new Response(
          JSON.stringify({ error: "Missing appointment_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get appointment details
      const { data: apt, error: aptErr } = await supabase
        .from("appointments")
        .select(`
          *,
          booking_branches(name_th, name_en, address_th, address_en, google_maps_url),
          booking_services(name_th, name_en)
        `)
        .eq("id", appointment_id)
        .single();

      if (aptErr || !apt) {
        return new Response(
          JSON.stringify({ error: "Appointment not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Skip if already sent, cancelled, or no-show
      if (apt.review_email_sent_at) {
        return new Response(
          JSON.stringify({ success: true, message: "Review email already sent", skipped: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (['cancelled', 'no_show'].includes(apt.status)) {
        return new Response(
          JSON.stringify({ success: true, message: "Skipped — cancelled or no-show", skipped: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get email
      let email = apt.contact_email;
      if (!email && apt.user_id) {
        const { data: userData } = await supabase.auth.admin.getUserById(apt.user_id);
        email = userData?.user?.email;
      }

      if (!email) {
        return new Response(
          JSON.stringify({ success: true, message: "No email available", skipped: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get multi-service names
      const { data: services } = await supabase
        .from("appointment_services")
        .select("booking_services(name_en, name_th)")
        .eq("appointment_id", appointment_id);

      const serviceNames = (services || [])
        .map((s: any) => s.booking_services?.name_en)
        .filter(Boolean)
        .join(", ") || apt.booking_services?.name_en || "Service";

      const branchName = apt.booking_branches?.name_en || "SWING Service Point";
      const branchLandmark = apt.booking_branches?.address_en || apt.booking_branches?.address_th || '';
      const branchMapUrl = apt.booking_branches?.google_maps_url || '';
      const reviewUrl = `https://testd-health.lovable.app/my-appointments`;

      // Send review email via transactional system
      const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'post-service-review',
          recipientEmail: email,
          idempotencyKey: `review-${appointment_id}`,
          templateData: {
            branchName,
            landmark: branchLandmark || undefined,
            googleMapsUrl: branchMapUrl || undefined,
            serviceName: serviceNames,
            appointmentDate: apt.appointment_date,
            reviewUrl,
          },
        },
      });

      if (sendErr) {
        console.error("Failed to send review email:", sendErr);
        return new Response(
          JSON.stringify({ error: "Failed to send review email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as sent
      await supabase
        .from("appointments")
        .update({ review_email_sent_at: new Date().toISOString() })
        .eq("id", appointment_id);

      return new Response(
        JSON.stringify({ success: true, email_sent: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: generate, validate, execute, send_review" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
