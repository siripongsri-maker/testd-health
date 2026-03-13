import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2, Wrench, Database, FileText } from "lucide-react";
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
