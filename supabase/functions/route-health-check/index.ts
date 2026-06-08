// Route health check — fetches each enabled target on the published site and records the result.
// Public endpoint: callable by cron and by admin UI. No PII handled.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const BASE_URL = Deno.env.get("ROUTE_HEALTH_BASE_URL") ?? "https://testd.website";

interface Target {
  id: string;
  path: string;
  expected_substring: string | null;
  consecutive_failures: number;
}

async function checkOne(target: Target): Promise<{
  path: string;
  status_code: number | null;
  ok: boolean;
  error: string | null;
  duration_ms: number;
  content_length: number | null;
}> {
  const url = `${BASE_URL}${target.path}`;
  const started = performance.now();
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15_000);
    const resp = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "testd-route-health/1.0" },
    });
    clearTimeout(timeout);
    const text = await resp.text();
    const duration_ms = Math.round(performance.now() - started);
    let ok = resp.status >= 200 && resp.status < 400;
    let error: string | null = null;

    // SPA fallback always returns 200 — detect React NotFound by checking for known-bad markers
    if (ok && /404|Page not found|NotFound/i.test(text) && !text.includes("__VITE_SSR__")) {
      // Only flag if expected substring is set OR the body looks like the NotFound page
      if (/<title>.*404.*<\/title>/i.test(text)) {
        ok = false;
        error = "NotFound page detected";
      }
    }
    if (ok && target.expected_substring && !text.includes(target.expected_substring)) {
      ok = false;
      error = `Expected substring not found: ${target.expected_substring}`;
    }
    if (!ok && !error) error = `HTTP ${resp.status}`;

    return {
      path: target.path,
      status_code: resp.status,
      ok,
      error,
      duration_ms,
      content_length: text.length,
    };
  } catch (e) {
    return {
      path: target.path,
      status_code: null,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      duration_ms: Math.round(performance.now() - started),
      content_length: null,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: targets, error: tErr } = await supabase
      .from("route_health_targets")
      .select("id, path, expected_substring, consecutive_failures")
      .eq("enabled", true);

    if (tErr) throw tErr;

    const results = await Promise.all((targets ?? []).map((t) => checkOne(t as Target)));

    // Insert history rows
    if (results.length > 0) {
      await supabase.from("route_health_checks").insert(
        results.map((r) => ({
          path: r.path,
          status_code: r.status_code,
          ok: r.ok,
          error: r.error,
          duration_ms: r.duration_ms,
          content_length: r.content_length,
        })),
      );
    }

    // Update target latest snapshot
    const byPath = new Map(results.map((r) => [r.path, r]));
    for (const t of (targets ?? []) as Target[]) {
      const r = byPath.get(t.path);
      if (!r) continue;
      await supabase
        .from("route_health_targets")
        .update({
          last_checked_at: new Date().toISOString(),
          last_status_code: r.status_code,
          last_ok: r.ok,
          last_error: r.error,
          consecutive_failures: r.ok ? 0 : (t.consecutive_failures ?? 0) + 1,
        })
        .eq("id", t.id);
    }

    const failing = results.filter((r) => !r.ok);
    return new Response(
      JSON.stringify({
        base_url: BASE_URL,
        checked: results.length,
        failing: failing.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
