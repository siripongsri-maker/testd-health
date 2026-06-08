// Post-deploy smoke test for the live site.
// Polls testd.website/index.html every 5 minutes, extracts the Vite asset fingerprint,
// and if it changed since the last recorded deploy, runs all critical routes and records the result.
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

async function fetchBuildFingerprint(): Promise<{ fingerprint: string; html: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const resp = await fetch(`${BASE_URL}/?_smoke=${Date.now()}`, {
      cache: "no-store",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "testd-route-smoke/1.0", "cache-control": "no-cache" },
    });
    const html = await resp.text();
    if (!resp.ok) return null;
    // Look for hashed Vite asset: /assets/index-XXXXXXXX.js
    const m = html.match(/\/assets\/[A-Za-z0-9_.-]+-([A-Za-z0-9]{6,})\.js/);
    const fingerprint = m ? m[0] : `etag:${resp.headers.get("etag") ?? "none"}|len:${html.length}`;
    return { fingerprint, html };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function checkOne(target: Target) {
  const url = `${BASE_URL}${target.path}`;
  const started = performance.now();
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15_000);
    const resp = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "testd-route-smoke/1.0" },
    });
    clearTimeout(timeout);
    const text = await resp.text();
    const duration_ms = Math.round(performance.now() - started);
    let ok = resp.status >= 200 && resp.status < 400;
    let error: string | null = null;
    if (ok && /<title>.*404.*<\/title>/i.test(text)) {
      ok = false;
      error = "NotFound page detected";
    }
    if (ok && target.expected_substring && !text.includes(target.expected_substring)) {
      ok = false;
      error = `Expected substring not found: ${target.expected_substring}`;
    }
    if (!ok && !error) error = `HTTP ${resp.status}`;
    return { path: target.path, status_code: resp.status, ok, error, duration_ms, content_length: text.length };
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

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const startedAll = performance.now();
  const fp = await fetchBuildFingerprint();
  if (!fp) {
    return new Response(JSON.stringify({ ok: false, reason: "fingerprint_fetch_failed" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Has this build already been smoke-tested?
  const { data: existing } = await supabase
    .from("route_health_deploys")
    .select("id, smoke_status")
    .eq("build_fingerprint", fp.fingerprint)
    .maybeSingle();

  if (existing && !force) {
    return new Response(
      JSON.stringify({
        ok: true,
        skipped: true,
        reason: "build_unchanged",
        build_fingerprint: fp.fingerprint,
        last_status: existing.smoke_status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // New deploy detected → run smoke test against all enabled targets
  const { data: targets, error: tErr } = await supabase
    .from("route_health_targets")
    .select("id, path, expected_substring, consecutive_failures")
    .eq("enabled", true);
  if (tErr) {
    return new Response(JSON.stringify({ ok: false, error: tErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = await Promise.all((targets ?? []).map((t) => checkOne(t as Target)));
  const failing = results.filter((r) => !r.ok);

  // Record check history rows
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

  // Update target snapshots
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

  const totalMs = Math.round(performance.now() - startedAll);
  const smoke_status = failing.length === 0 ? "pass" : "fail";

  const deployRow = existing
    ? await supabase
        .from("route_health_deploys")
        .update({
          smoke_status,
          checked_count: results.length,
          failing_count: failing.length,
          failing_paths: failing.map((f) => ({ path: f.path, error: f.error, status: f.status_code })),
          duration_ms: totalMs,
        })
        .eq("id", existing.id)
        .select()
        .single()
    : await supabase
        .from("route_health_deploys")
        .insert({
          build_fingerprint: fp.fingerprint,
          base_url: BASE_URL,
          smoke_status,
          checked_count: results.length,
          failing_count: failing.length,
          failing_paths: failing.map((f) => ({ path: f.path, error: f.error, status: f.status_code })),
          duration_ms: totalMs,
        })
        .select()
        .single();

  return new Response(
    JSON.stringify({
      ok: true,
      new_deploy: !existing,
      build_fingerprint: fp.fingerprint,
      smoke_status,
      checked: results.length,
      failing: failing.length,
      failing_paths: failing.map((f) => f.path),
      duration_ms: totalMs,
      deploy: deployRow.data,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
