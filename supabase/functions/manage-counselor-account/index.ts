import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreatePayload {
  action: "create";
  email: string;
  password: string;
  full_name: string;
  nickname?: string;
  branch_id: string;
  is_active?: boolean;
}
interface UpdatePayload {
  action: "update";
  user_id: string;
  full_name?: string;
  nickname?: string;
  branch_id?: string;
  is_active?: boolean;
}
interface ResetPayload {
  action: "reset_password";
  user_id: string;
  password: string;
}
type Payload = CreatePayload | UpdatePayload | ResetPayload;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) return json({ error: "Invalid token" }, 401);

    const { data: isAdmin } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const body = (await req.json()) as Payload;

    if (body.action === "create") {
      const { email, password, full_name, nickname, branch_id, is_active = true } = body;
      if (!email || !password || !full_name || !branch_id) return json({ error: "Missing required fields" }, 400);
      if (password.length < 8 || password.length > 128) return json({ error: "Password must be 8-128 characters" }, 400);

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: nickname || full_name },
      });
      if (cErr || !created?.user) return json({ error: cErr?.message || "Failed to create user" }, 400);
      const uid = created.user.id;

      const { error: rErr } = await admin.from("user_roles").insert({ user_id: uid, role: "counselor" });
      if (rErr) console.error("role insert error", rErr);

      const { error: pErr } = await admin.from("counselor_profiles").insert({
        user_id: uid, full_name, nickname: nickname ?? null, branch_id, is_active,
      });
      if (pErr) {
        // rollback the auth user to avoid orphans
        await admin.auth.admin.deleteUser(uid).catch(() => {});
        return json({ error: pErr.message }, 400);
      }

      await admin.from("profiles").update({ display_name: nickname || full_name }).eq("id", uid);

      return json({ success: true, user_id: uid });
    }

    if (body.action === "update") {
      const { user_id, full_name, nickname, branch_id, is_active } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      const patch: Record<string, unknown> = {};
      if (full_name !== undefined) patch.full_name = full_name;
      if (nickname !== undefined) patch.nickname = nickname;
      if (branch_id !== undefined) patch.branch_id = branch_id;
      if (is_active !== undefined) patch.is_active = is_active;
      const { error } = await admin.from("counselor_profiles").update(patch).eq("user_id", user_id);
      if (error) return json({ error: error.message }, 400);

      // If deactivating, also revoke active sessions
      if (is_active === false) {
        await admin.auth.admin.signOut(user_id).catch(() => {});
      }
      return json({ success: true });
    }

    if (body.action === "reset_password") {
      const { user_id, password } = body;
      if (!user_id || !password) return json({ error: "user_id and password required" }, 400);
      if (password.length < 8 || password.length > 128) return json({ error: "Password must be 8-128 characters" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
