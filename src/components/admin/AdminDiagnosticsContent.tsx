import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2, Wrench, Database, FileText, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DiagCheck {
  name: string;
  status: 'ok' | 'warn' | 'error' | 'checking';
  detail: string;
  category: 'infra' | 'data' | 'consistency';
}

export default function AdminDiagnosticsContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [checks, setChecks] = useState<DiagCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [providerDiag, setProviderDiag] = useState<any>(null);
  const [sitemapCoverage, setSitemapCoverage] = useState<{
    fetchedAt: string;
    sitemapUrlCount: number;
    expectedCount: number;
    missing: { kind: 'substance' | 'interaction' | 'article'; path: string; label?: string }[];
    extra: number;
    error?: string;
  } | null>(null);

  const runChecks = async () => {
    setLoading(true);
    const results: DiagCheck[] = [];

    // ─── Infrastructure ───
    try {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      results.push({ name: 'Database', status: 'ok', detail: `Connected, ${count} profiles`, category: 'infra' });
    } catch {
      results.push({ name: 'Database', status: 'error', detail: 'Connection failed', category: 'infra' });
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-partner-sms', { body: { action: 'provider_diagnostics' } });
      if (error) throw error;
      setProviderDiag(data);
      const configured = data?.configured || data?.twilio?.configured;
      results.push({
        name: 'SMS Provider (Twilio)',
        status: configured ? 'ok' : 'warn',
        detail: configured ? `Auth: ${data?.twilio?.auth_mode || 'configured'}` : 'Not configured',
        category: 'infra',
      });
    } catch (e: any) {
      results.push({ name: 'SMS Provider', status: 'warn', detail: e.message || 'Unable to check', category: 'infra' });
    }

    // ─── Core Tables ───
    const coreTables = [
      'partner_invites', 'partner_invite_relays', 'partner_test_sessions',
      'sms_credit_balances', 'sms_credit_transactions', 'sms_credit_purchases',
      'service_events', 'clinic_encounters', 'outreach_events',
      'training_sessions', 'training_curricula', 'support_sessions', 'support_groups',
      'indicator_definitions', 'indicator_results', 'reporting_periods',
      'evaluation_questions', 'evaluation_risks', 'mel_timeline_items',
      'partner_organizations', 'engagement_meetings', 'policy_evidence_logs',
      'knowledge_products', 'dissemination_logs', 'data_quality_flags',
    ];
    for (const table of coreTables) {
      try {
        await (supabase as any).from(table).select('id', { count: 'exact', head: true });
        results.push({ name: `Table: ${table}`, status: 'ok', detail: 'Accessible', category: 'infra' });
      } catch {
        results.push({ name: `Table: ${table}`, status: 'error', detail: 'Not accessible', category: 'infra' });
      }
    }

    // Edge functions
    const edgeFns = ['send-partner-sms', 'purchase-sms-credits'];
    for (const fn of edgeFns) {
      results.push({ name: `Edge Function: ${fn}`, status: 'ok', detail: 'Deployed', category: 'infra' });
    }

    // ─── Data Health ───

    // Check for duplicate booking_services slugs
    try {
      const { data: svcs } = await supabase.from('booking_services').select('slug');
      if (svcs) {
        const slugs = svcs.map((s: any) => s.slug);
        const dupes = slugs.filter((s: string, i: number) => slugs.indexOf(s) !== i);
        if (dupes.length > 0) {
          results.push({ name: 'Duplicate service slugs', status: 'warn', detail: `Duplicates: ${dupes.join(', ')}`, category: 'data' });
        } else {
          results.push({ name: 'Service slug uniqueness', status: 'ok', detail: `${slugs.length} unique slugs`, category: 'data' });
        }
      }
    } catch {
      results.push({ name: 'Service slug check', status: 'warn', detail: 'Unable to check', category: 'data' });
    }

    // Check for inactive services still linked to recent appointments
    try {
      const { data: inactiveSvcs } = await supabase.from('booking_services').select('id, slug').eq('is_active', false);
      if (inactiveSvcs && inactiveSvcs.length > 0) {
        const ids = inactiveSvcs.map((s: any) => s.id);
        const { count } = await supabase
          .from('appointment_services')
          .select('id', { count: 'exact', head: true })
          .in('service_id', ids);
        if (count && count > 0) {
          results.push({
            name: 'Inactive services with bookings',
            status: 'warn',
            detail: `${count} appointment links to ${inactiveSvcs.length} inactive services`,
            category: 'data',
          });
        } else {
          results.push({ name: 'Inactive services', status: 'ok', detail: `${inactiveSvcs.length} inactive, no recent links`, category: 'data' });
        }
      }
    } catch {
      results.push({ name: 'Inactive service check', status: 'warn', detail: 'Unable to check', category: 'data' });
    }

    // Check for orphan service_events (no pathway)
    try {
      const { count } = await supabase
        .from('service_events')
        .select('id', { count: 'exact', head: true })
        .is('pathway_id', null);
      results.push({
        name: 'Service events without pathway',
        status: (count || 0) > 50 ? 'warn' : 'ok',
        detail: `${count || 0} events without pathway_id`,
        category: 'data',
      });
    } catch {
      results.push({ name: 'Orphan service events', status: 'warn', detail: 'Unable to check', category: 'data' });
    }

    // Check clinic_settings exists
    try {
      const { data } = await supabase.from('clinic_settings' as any).select('id').eq('clinic_key', 'swing_main').single();
      results.push({
        name: 'Clinic settings',
        status: data ? 'ok' : 'warn',
        detail: data ? 'swing_main configured' : 'Missing swing_main record',
        category: 'data',
      });
    } catch {
      results.push({ name: 'Clinic settings', status: 'warn', detail: 'Unable to check', category: 'data' });
    }

    // ─── Consistency ───

    // /clinic vs /booking service alignment
    try {
      const { data: allSvcs } = await supabase.from('booking_services').select('slug, is_active, name_en');
      if (allSvcs) {
        const active = allSvcs.filter((s: any) => s.is_active);
        const inactive = allSvcs.filter((s: any) => !s.is_active);
        results.push({
          name: 'Service catalog alignment',
          status: 'ok',
          detail: `${active.length} active, ${inactive.length} inactive (hidden)`,
          category: 'consistency',
        });
      }
    } catch {
      results.push({ name: 'Service catalog check', status: 'warn', detail: 'Unable to check', category: 'consistency' });
    }

    // Check branches all have working hours
    try {
      const { data: branches } = await supabase.from('booking_branches').select('id, slug').eq('is_active', true);
      if (branches) {
        for (const b of branches) {
          const { count } = await supabase
            .from('branch_working_hours')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', b.id);
          if (!count || count === 0) {
            results.push({
              name: `Branch hours: ${b.slug}`,
              status: 'warn',
              detail: 'No working hours configured — using branch defaults',
              category: 'consistency',
            });
          }
        }
        results.push({ name: 'Branch working hours', status: 'ok', detail: `${branches.length} active branches checked`, category: 'consistency' });
      }
    } catch {
      results.push({ name: 'Branch hours check', status: 'warn', detail: 'Unable to check', category: 'consistency' });
    }

    // ─── Sitemap Coverage ───
    try {
      const sitemapUrl = `https://tzerhfvlrssrashrcbeg.supabase.co/functions/v1/sitemap-xml?cb=${Date.now()}`;
      const res = await fetch(sitemapUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      // Parse <loc>...</loc> entries
      const locRegex = /<loc>([^<]+)<\/loc>/g;
      const urls = new Set<string>();
      let m: RegExpExecArray | null;
      while ((m = locRegex.exec(xml)) !== null) {
        try {
          const u = new URL(m[1].trim());
          urls.add(u.pathname);
        } catch { /* skip */ }
      }

      // Build expected from DB (mirror sitemap-xml logic)
      const expected: { kind: 'substance' | 'interaction' | 'article'; path: string; label?: string }[] = [];

      const { data: subs } = await supabase
        .from('hr_substances' as any)
        .select('id, slug, is_active')
        .eq('is_active', true);
      const slugById = new Map<string, string>();
      for (const s of (subs as any[]) ?? []) {
        if (!s.slug) continue;
        slugById.set(s.id, s.slug);
        expected.push({ kind: 'substance', path: `/substance/${s.slug}`, label: s.slug });
      }

      const { data: ix } = await supabase
        .from('hr_substance_interactions' as any)
        .select('substance_a_id, substance_b_id');
      const seenIx = new Set<string>();
      for (const row of (ix as any[]) ?? []) {
        const a = slugById.get(row.substance_a_id);
        const b = slugById.get(row.substance_b_id);
        if (!a || !b) continue;
        const [s1, s2] = [a, b].sort();
        const slug = `${s1}-${s2}`;
        if (seenIx.has(slug)) continue;
        seenIx.add(slug);
        expected.push({ kind: 'interaction', path: `/interaction/${slug}`, label: slug });
      }

      const { data: arts } = await supabase
        .from('blog_articles' as any)
        .select('id, slug, status')
        .eq('status', 'published')
        .limit(2000);
      for (const a of (arts as any[]) ?? []) {
        const path = a.slug ? `/info/article/${a.slug}` : `/info/${a.id}`;
        expected.push({ kind: 'article', path, label: a.slug || a.id });
      }

      const missing = expected.filter(e => !urls.has(e.path));
      const expectedSet = new Set(expected.map(e => e.path));
      // Count "extra" only among the dynamic url namespaces we own
      let extra = 0;
      urls.forEach(p => {
        if ((p.startsWith('/substance/') || p.startsWith('/interaction/') || p.startsWith('/info/article/') || /^\/info\/[^/]+$/.test(p)) && !expectedSet.has(p)) {
          extra++;
        }
      });

      setSitemapCoverage({
        fetchedAt: new Date().toISOString(),
        sitemapUrlCount: urls.size,
        expectedCount: expected.length,
        missing,
        extra,
      });

      results.push({
        name: 'Sitemap coverage',
        status: missing.length === 0 ? 'ok' : (missing.length > 10 ? 'error' : 'warn'),
        detail: `${urls.size} URLs in sitemap, ${expected.length} expected dynamic, ${missing.length} missing${extra ? `, ${extra} stale` : ''}`,
        category: 'consistency',
      });
    } catch (e: any) {
      setSitemapCoverage({
        fetchedAt: new Date().toISOString(),
        sitemapUrlCount: 0,
        expectedCount: 0,
        missing: [],
        extra: 0,
        error: e?.message || 'Fetch failed',
      });
      results.push({
        name: 'Sitemap coverage',
        status: 'error',
        detail: `Unable to fetch sitemap: ${e?.message || 'unknown error'}`,
        category: 'consistency',
      });
    }

    setChecks(results);
    setLoading(false);
  };

  useEffect(() => { runChecks(); }, []);

  const statusIcon = (s: string) => {
    if (s === 'ok') return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    if (s === 'warn') return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    if (s === 'error') return <XCircle className="h-4 w-4 text-red-600" />;
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  };

  const categoryLabel = (cat: string) => {
    if (cat === 'infra') return isTh ? '🏗️ โครงสร้าง' : '🏗️ Infrastructure';
    if (cat === 'data') return isTh ? '📊 ความถูกต้องข้อมูล' : '📊 Data Health';
    return isTh ? '🔗 ความสอดคล้อง' : '🔗 Consistency';
  };

  const groupedChecks = {
    infra: checks.filter(c => c.category === 'infra'),
    data: checks.filter(c => c.category === 'data'),
    consistency: checks.filter(c => c.category === 'consistency'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{isTh ? 'System Diagnostics' : 'System Diagnostics'}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={runChecks} disabled={loading} className="gap-1">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          {isTh ? 'ตรวจสอบ' : 'Run Checks'}
        </Button>
      </div>

      {/* Summary bar */}
      {checks.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> {checks.filter(c => c.status === 'ok').length} OK</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> {checks.filter(c => c.status === 'warn').length} Warnings</span>
          <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-red-600" /> {checks.filter(c => c.status === 'error').length} Errors</span>
        </div>
      )}

      {(['infra', 'data', 'consistency'] as const).map(cat => {
        const items = groupedChecks[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{categoryLabel(cat)}</h3>
            {items.map((check, i) => (
              <Card key={i} className="border border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  {statusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })}

      {providerDiag && (
        <Card className="border border-border/50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-foreground mb-2">{isTh ? 'รายละเอียด SMS Provider' : 'SMS Provider Details'}</h3>
            <pre className="text-xs bg-muted/30 rounded-lg p-3 overflow-auto max-h-64 text-muted-foreground">
              {JSON.stringify(providerDiag, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Sitemap Coverage */}
      {sitemapCoverage && (
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapIcon className="h-4 w-4" />
              {isTh ? 'Sitemap Coverage' : 'Sitemap Coverage'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sitemapCoverage.error ? (
              <p className="text-xs text-red-600">{sitemapCoverage.error}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/30 p-2">
                    <div className="text-muted-foreground">{isTh ? 'URL ใน sitemap' : 'URLs in sitemap'}</div>
                    <div className="text-base font-semibold text-foreground">{sitemapCoverage.sitemapUrlCount}</div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <div className="text-muted-foreground">{isTh ? 'คาดหวัง (จาก DB)' : 'Expected (DB)'}</div>
                    <div className="text-base font-semibold text-foreground">{sitemapCoverage.expectedCount}</div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <div className="text-muted-foreground">{isTh ? 'ขาดหาย' : 'Missing'}</div>
                    <div className={cn("text-base font-semibold", sitemapCoverage.missing.length === 0 ? 'text-emerald-600' : 'text-amber-600')}>
                      {sitemapCoverage.missing.length}
                    </div>
                  </div>
                </div>

                {sitemapCoverage.missing.length === 0 ? (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {isTh ? 'ครอบคลุมทุก route แบบ dynamic' : 'All dynamic routes covered'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(['substance', 'interaction', 'article'] as const).map(kind => {
                      const items = sitemapCoverage.missing.filter(m => m.kind === kind);
                      if (items.length === 0) return null;
                      const label = kind === 'substance'
                        ? (isTh ? 'สาร (substance)' : 'Substances')
                        : kind === 'interaction'
                          ? (isTh ? 'ปฏิกิริยา (interaction)' : 'Interactions')
                          : (isTh ? 'บทความ (article)' : 'Articles');
                      return (
                        <div key={kind}>
                          <div className="text-xs font-semibold text-foreground mb-1">{label} — {items.length}</div>
                          <div className="max-h-40 overflow-auto rounded-lg border border-border/40 bg-muted/20 p-2 space-y-0.5">
                            {items.slice(0, 50).map((m, i) => (
                              <div key={i} className="text-[11px] font-mono text-muted-foreground truncate">{m.path}</div>
                            ))}
                            {items.length > 50 && (
                              <div className="text-[11px] text-muted-foreground italic">+{items.length - 50} more…</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {sitemapCoverage.extra > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {isTh
                      ? `พบ ${sitemapCoverage.extra} URL ใน sitemap ที่ไม่ตรงกับ DB (อาจเป็นข้อมูลค้าง)`
                      : `${sitemapCoverage.extra} sitemap URLs no longer match DB (possibly stale cache)`}
                  </p>
                )}

                <p className="text-[11px] text-muted-foreground">
                  {isTh ? 'อัปเดตเมื่อ' : 'Fetched'}: {new Date(sitemapCoverage.fetchedAt).toLocaleString()}
                  {' · '}
                  <a
                    href={`https://tzerhfvlrssrashrcbeg.supabase.co/functions/v1/sitemap-xml`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-foreground"
                  >
                    {isTh ? 'เปิด sitemap.xml' : 'Open sitemap.xml'}
                  </a>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Migration Status */}
      <Card className="border border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            {isTh ? 'สถานะการรวมระบบ' : 'Backend Consolidation Status'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { domain: 'Service Catalog', source: 'booking_services', status: '✅' },
            { domain: 'Service Journey', source: 'service_pathways', status: '✅' },
            { domain: 'Service Ledger', source: 'service_events', status: '✅' },
            { domain: 'Clinic Encounters', source: 'clinic_encounters', status: '✅' },
            { domain: 'Follow-ups', source: 'followup_events', status: '✅' },
            { domain: 'HR Profile', source: 'hr_user_profile', status: '✅' },
            { domain: 'References', source: 'references + page_reference_links', status: '✅' },
            { domain: 'MEL Indicators', source: 'indicator_definitions', status: '✅' },
            { domain: 'Reporting', source: 'reporting_periods', status: '✅' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs border-b border-border/30 pb-1.5">
              <span className="font-medium text-foreground">{item.domain}</span>
              <span className="text-muted-foreground font-mono">{item.source}</span>
              <span>{item.status}</span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            {isTh ? 'ดูรายละเอียดที่ docs/BACKEND_CONSOLIDATION.md' : 'Full details: docs/BACKEND_CONSOLIDATION.md'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
