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

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify the caller owns the given appointment.
 * Ownership is proven either by:
 *   - a valid Bearer JWT whose auth.uid() matches appointments.user_id, OR
 *   - a plaintext `guest_token` whose SHA-256 matches appointments.guest_access_hash.
 * Returns the appointment row on success, or null.
 */
async function verifyAppointmentOwnership(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  anonKey: string,
  authHeader: string | null,
  appointmentId: string,
  guestToken: string | null,
) {
  const { data: apt } = await supabase
    .from("appointments")
    .select("id, user_id, guest_access_hash, guest_access_expires_at, contact_email, appointment_date, start_time, branch_id, status")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!apt) return null;

  // Auth path
  if (authHeader) {
    try {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user && apt.user_id && user.id === apt.user_id) return apt;
    } catch { /* ignore */ }
  }

  // Guest token path
  if (guestToken && apt.guest_access_hash) {
    const hashed = await sha256Hex(guestToken);
    const notExpired = !apt.guest_access_expires_at || new Date(apt.guest_access_expires_at) > new Date();
    if (hashed === apt.guest_access_hash && notExpired) return apt;
  }

  return null;
}

// Invoke send-transactional-email with the service-role bearer.
// supabase.functions.invoke() forwards the caller's auth header (anon/user JWT),
// which the send function rejects as 403 non-service-role. We must fetch directly.
async function invokeSendTransactionalEmail(
  supabaseUrl: string,
  serviceKey: string,
  payload: Record<string, unknown>,
): Promise<{ error: { message: string; status?: number } | null }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: { message: text || `HTTP ${res.status}`, status: res.status } };
    }
    await res.text().catch(() => "");
    return { error: null };
  } catch (e) {
    return { error: { message: e instanceof Error ? e.message : String(e) } };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));
    const { action, appointment_id, code, guest_token, appointment_action } = body ?? {};

    // Action: generate — mint a verification code (OWNERSHIP REQUIRED)
    if (action === "generate") {
      if (!appointment_id) {
        return new Response(
          JSON.stringify({ error: "Missing appointment_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const owned = await verifyAppointmentOwnership(
        supabase, supabaseUrl, anonKey, authHeader, appointment_id, guest_token ?? null,
      );
      if (!owned) {
        return new Response(
          JSON.stringify({ error: "Forbidden — ownership proof required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const verificationCode = generateCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

      const { error } = await supabase
        .from("appointment_action_codes")
        .insert({
          appointment_id,
          code: verificationCode,
          action_type: "multi",
          expires_at: expiresAt,
        });

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

    // Action: send_action_email — server-side email issuance after booking.
    // Verifies ownership, generates code internally, and sends email using service role.
    // Client callers do NOT receive the code in the response.
    if (action === "send_action_email") {
      if (!appointment_id) {
        return new Response(
          JSON.stringify({ error: "Missing appointment_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const owned = await verifyAppointmentOwnership(
        supabase, supabaseUrl, anonKey, authHeader, appointment_id, guest_token ?? null,
      );
      if (!owned) {
        return new Response(
          JSON.stringify({ error: "Forbidden — ownership proof required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Load full appointment context server-side (do NOT trust client-supplied URLs)
      const { data: fullApt } = await supabase
        .from("appointments")
        .select(`
          id, appointment_date, start_time, contact_email, referral_code, user_id,
          booking_branches(name_th, name_en, address_th, address_en, google_maps_url),
          booking_services(name_th, name_en)
        `)
        .eq("id", appointment_id)
        .single();

      if (!fullApt) {
        return new Response(
          JSON.stringify({ error: "Appointment not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let email = fullApt.contact_email;
      if (!email && fullApt.user_id) {
        const { data: userData } = await supabase.auth.admin.getUserById(fullApt.user_id);
        email = userData?.user?.email ?? null;
      }
      if (!email) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "no_email" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mint verification code
      const verificationCode = generateCode();
      const codeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: codeErr } = await supabase
        .from("appointment_action_codes")
        .insert({
          appointment_id,
          code: verificationCode,
          action_type: "multi",
          expires_at: codeExpiresAt,
        });
      if (codeErr) {
        console.error("Failed to insert action code:", codeErr);
        return new Response(
          JSON.stringify({ error: "Failed to prepare email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: services } = await supabase
        .from("appointment_services")
        .select("booking_services(name_en, name_th)")
        .eq("appointment_id", appointment_id);

      const serviceNames = (services || [])
        .map((s: any) => s.booking_services?.name_en)
        .filter(Boolean)
        .join(", ") || (fullApt as any).booking_services?.name_en || "Service";

      const branch = (fullApt as any).booking_branches;
      const branchName = branch?.name_en || branch?.name_th || "SWING Service Point";
      const landmark = branch?.address_en || branch?.address_th || undefined;
      const googleMapsUrl = branch?.google_maps_url || undefined;

      const appUrl = "https://testd-health.lovable.app";
      const guestTokenParam = guest_token ? `?token=${encodeURIComponent(guest_token)}` : "";
      const guestUrl = `${appUrl}/guest-appointments${guestTokenParam}`;
      // Signed-in users should land on their own appointment list, not the guest lookup page.
      const authedActionUrl = `${appUrl}/my-appointments`;
      const actionUrl = fullApt.user_id ? authedActionUrl : guestUrl;

      // Format date/time for humans. DB serializes as YYYY-MM-DD and HH:MM:SS.
      const formatApptDate = (d: string | null | undefined): string => {
        if (!d) return "";
        const parsed = new Date(`${d}T00:00:00`);
        if (isNaN(parsed.getTime())) return String(d);
        try {
          return new Intl.DateTimeFormat("en-GB", {
            day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok",
          }).format(parsed);
        } catch { return String(d); }
      };
      const formatApptTime = (t: string | null | undefined): string => {
        if (!t) return "";
        const m = String(t).match(/^(\d{2}):(\d{2})/);
        return m ? `${m[1]}:${m[2]}` : String(t);
      };

      const { error: sendErr } = await invokeSendTransactionalEmail(supabaseUrl, serviceKey, {
        templateName: "appointment-action",
        recipientEmail: email,
        idempotencyKey: `apt-action-${appointment_id}`,
        templateData: {
          branchName,
          landmark,
          googleMapsUrl,
          serviceName: serviceNames,
          appointmentDate: formatApptDate(fullApt.appointment_date),
          appointmentTime: formatApptTime(fullApt.start_time),
          verificationCode,
          referralCode: fullApt.referral_code,
          checkinUrl: actionUrl,
          confirmUrl: actionUrl,
          rescheduleUrl: `${appUrl}/booking`,
          cancelUrl: actionUrl,
        },
      });

      if (sendErr) {
        console.error("Failed to send action email:", sendErr);
        return new Response(
          JSON.stringify({ error: "Failed to send email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, email_queued: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: validate — check if code is valid (code itself is the auth token)
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

    // Action: execute — code presents as the auth token
    if (action === "execute") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Missing code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      await supabase
        .from("appointment_action_codes")
        .update({ used_at: new Date().toISOString(), used_action: appointment_action ?? null })
        .eq("id", codeRecord.id);

      return new Response(
        JSON.stringify({ success: true, appointment_id: codeRecord.appointment_id, current_status: apt.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: send_review — trigger post-service review email (ownership required)
    if (action === "send_review") {
      if (!appointment_id) {
        return new Response(
          JSON.stringify({ error: "Missing appointment_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // send_review may be invoked by internal cron/edge as service role — accept that
      // by checking for the service role bearer; otherwise require ownership proof.
      const isServiceRole = authHeader === `Bearer ${serviceKey}`;
      if (!isServiceRole) {
        const owned = await verifyAppointmentOwnership(
          supabase, supabaseUrl, anonKey, authHeader, appointment_id, guest_token ?? null,
        );
        if (!owned) {
          return new Response(
            JSON.stringify({ error: "Forbidden — ownership proof required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

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

      const { error: sendErr } = await invokeSendTransactionalEmail(supabaseUrl, serviceKey, {
        templateName: 'post-service-review',
        recipientEmail: email,
        idempotencyKey: `review-${appointment_id}`,
        templateData: {
          branchName,
          landmark: branchLandmark || undefined,
          googleMapsUrl: branchMapUrl || undefined,
          serviceName: serviceNames,
          appointmentDate: (() => {
            const d = apt.appointment_date;
            if (!d) return '';
            const parsed = new Date(`${d}T00:00:00`);
            if (isNaN(parsed.getTime())) return String(d);
            try {
              return new Intl.DateTimeFormat('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
              }).format(parsed);
            } catch { return String(d); }
          })(),
          reviewUrl,
        },
      });

      if (sendErr) {
        console.error("Failed to send review email:", sendErr);
        return new Response(
          JSON.stringify({ error: "Failed to send review email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
      JSON.stringify({ error: "Unknown action. Use: generate, send_action_email, validate, execute, send_review" }),
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
