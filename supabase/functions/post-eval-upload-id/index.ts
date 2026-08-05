// Post-counseling travel-allowance ID card upload (guest, token-scoped).
// Verifies the post-eval magic token server-side, stores the image in the
// private `identity-docs` bucket and returns only the storage path.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const dataUrl = typeof body?.image === "string" ? body.image : "";
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRe.test(token) || !dataUrl.startsWith("data:")) {
      return json({ error: "invalid_request" }, 400);
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match || !ALLOWED.includes(match[1])) {
      return json({ error: "unsupported_image_type" }, 400);
    }
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    if (bytes.byteLength > MAX_BYTES) return json({ error: "image_too_large" }, 400);

    // Token must map to a counseling note that already has an evaluation
    const { data: note } = await admin
      .from("pre_service_counseling_notes")
      .select("id, branch_id")
      .eq("post_eval_token", token)
      .maybeSingle();
    if (!note) return json({ error: "invalid_token" }, 403);

    const { data: evalRow } = await admin
      .from("post_counseling_evaluations")
      .select("id")
      .eq("note_id", note.id)
      .maybeSingle();
    if (!evalRow) return json({ error: "evaluation_required" }, 409);

    const { data: existing } = await admin
      .from("counseling_payout_claims")
      .select("id")
      .eq("evaluation_id", evalRow.id)
      .maybeSingle();
    if (existing) return json({ error: "claim_already_submitted" }, 409);

    const ext = match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
    const path = `post-counseling/${note.id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("identity-docs")
      .upload(path, bytes, { contentType: match[1], upsert: false });
    if (upErr) {
      console.error("ID_UPLOAD_FAILED", upErr.message);
      return json({ error: "upload_failed", details: upErr.message }, 500);
    }

    return json({ path });
  } catch (err) {
    console.error("POST_EVAL_ID_UPLOAD_ERROR", err);
    return json({ error: "server_error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
