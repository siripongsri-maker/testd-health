import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { thread_id, message_preview, sender_name } = await req.json();
    if (!thread_id) throw new Error("thread_id required");

    // Get all admins with email notifications enabled
    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminIds = admins.map(a => a.user_id);

    // Check notification prefs for each admin
    const { data: prefs } = await supabaseAdmin
      .from("admin_chat_notification_prefs")
      .select("*")
      .in("user_id", adminIds);

    const prefsMap = new Map((prefs || []).map(p => [p.user_id, p]));
    const now = new Date();
    let emailsSent = 0;

    for (const adminId of adminIds) {
      const pref = prefsMap.get(adminId);
      const emailEnabled = pref?.email_enabled ?? true; // default true
      const cooldown = pref?.email_cooldown_minutes ?? 15;
      const lastSent = pref?.last_email_sent_at ? new Date(pref.last_email_sent_at) : null;

      if (!emailEnabled) continue;

      // Check cooldown
      if (lastSent && (now.getTime() - lastSent.getTime()) < cooldown * 60 * 1000) continue;

      // Get admin email
      const { data: { user: adminUser } } = await supabaseAdmin.auth.admin.getUserById(adminId);
      if (!adminUser?.email) continue;

      // Send email notification via transactional email system
      try {
        await supabaseAdmin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "chat-new-message",
            recipientEmail: adminUser.email,
            idempotencyKey: `chat-notify-${thread_id}-${Date.now()}`,
            templateData: {
              senderName: sender_name || "ผู้ใช้",
              messagePreview: (message_preview || "").slice(0, 100),
              threadUrl: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/admin?tab=user-chats`,
            },
          },
        });
        emailsSent++;
      } catch (emailErr) {
        console.error(`Failed to send email to admin ${adminId}:`, emailErr);
      }

      // Update last sent
      await supabaseAdmin
        .from("admin_chat_notification_prefs")
        .upsert({
          user_id: adminId,
          email_enabled: true,
          in_app_enabled: true,
          email_cooldown_minutes: cooldown,
          last_email_sent_at: now.toISOString(),
        }, { onConflict: "user_id" });
    }

    return new Response(JSON.stringify({ notified: emailsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-notify-admin error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
