import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/lib/i18n';
import { ChevronDown, ChevronRight, Radio, Search, Calendar, TestTube2, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

type LinkRow = {
  id: string;
  slug: string;
  campaign: string | null;
  channel: string | null;
  destination_path: string | null;
  click_count: number | null;
};

type AttributedUser = {
  user_id: string;
  anonymous_id: string;
  last_touch_at: string | null;
  appointments: { id: string; status: string; created_at: string; branch_id: string | null; service_id: string | null }[];
  selftests: { id: string; status: string; created_at: string }[];
};

export function LinkCaseTrace() {
  const { language } = useLanguage();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [live, setLive] = useState(false);

  // Realtime — refresh when visitor_attribution, appointments, or selftest change
  useEffect(() => {
    const inv = () => {
      qc.invalidateQueries({ queryKey: ['link-trace-summary'] });
      qc.invalidateQueries({ queryKey: ['link-trace-cases'] });
    };
    const ch = supabase
      .channel('link-case-trace-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_attribution' }, inv)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, inv)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hiv_selftest_requests' }, inv)
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  // Per-link summary: attributed users, appointment count, selftest count
  const { data: summary, isLoading } = useQuery({
    queryKey: ['link-trace-summary'],
    queryFn: async () => {
      const { data: links, error: e1 } = await supabase
        .from('tracked_links')
        .select('id, slug, campaign, channel, destination_path, click_count')
        .order('created_at', { ascending: false })
        .limit(200);
      if (e1) throw e1;

      const { data: attr, error: e2 } = await supabase
        .from('visitor_attribution')
        .select('user_id, last_touch_link_id')
        .not('last_touch_link_id', 'is', null)
        .not('user_id', 'is', null)
        .limit(10000);
      if (e2) throw e2;

      const usersByLink = new Map<string, Set<string>>();
      (attr as any[])?.forEach((r) => {
        const set = usersByLink.get(r.last_touch_link_id) || new Set<string>();
        set.add(r.user_id);
        usersByLink.set(r.last_touch_link_id, set);
      });

      // Get all attributed user_ids in one shot for count queries
      const allUsers = Array.from(new Set((attr as any[]).map((r) => r.user_id)));
      const chunks = <T,>(arr: T[], n: number) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
        return out;
      };

      const apptCountByUser = new Map<string, number>();
      const selftestCountByUser = new Map<string, number>();
      for (const batch of chunks(allUsers, 500)) {
        const [{ data: aRows }, { data: sRows }] = await Promise.all([
          supabase.from('appointments').select('user_id').in('user_id', batch),
          supabase.from('hiv_selftest_requests').select('user_id').in('user_id', batch),
        ]);
        (aRows as any[])?.forEach((r) => apptCountByUser.set(r.user_id, (apptCountByUser.get(r.user_id) || 0) + 1));
        (sRows as any[])?.forEach((r) => selftestCountByUser.set(r.user_id, (selftestCountByUser.get(r.user_id) || 0) + 1));
      }

      return (links as LinkRow[]).map((l) => {
        const users = Array.from(usersByLink.get(l.id) || []);
        let appts = 0;
        let selftests = 0;
        users.forEach((u) => {
          appts += apptCountByUser.get(u) || 0;
          selftests += selftestCountByUser.get(u) || 0;
        });
        return { ...l, attributed_users: users.length, appointments: appts, selftests };
      });
    },
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    if (!summary) return [];
    const q = search.trim().toLowerCase();
    const list = q
      ? summary.filter((r) =>
          r.slug?.toLowerCase().includes(q) ||
          r.campaign?.toLowerCase().includes(q) ||
          r.channel?.toLowerCase().includes(q)
        )
      : summary;
    return [...list].sort((a, b) => (b.appointments + b.selftests) - (a.appointments + a.selftests));
  }, [summary, search]);

  // Per-link case detail — loaded only for expanded row
  const { data: cases } = useQuery({
    queryKey: ['link-trace-cases', expanded],
    enabled: !!expanded,
    queryFn: async () => {
      const { data: attr } = await supabase
        .from('visitor_attribution')
        .select('user_id, anonymous_id, last_touch_at')
        .eq('last_touch_link_id', expanded!)
        .not('user_id', 'is', null)
        .order('last_touch_at', { ascending: false })
        .limit(500);

      const userIds = Array.from(new Set((attr as any[]).map((r) => r.user_id)));
      if (!userIds.length) return [] as AttributedUser[];

      const [{ data: appts }, { data: selftests }] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, user_id, status, created_at, branch_id, service_id')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('hiv_selftest_requests')
          .select('id, user_id, status, created_at')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
      ]);

      const apptByUser = new Map<string, any[]>();
      (appts as any[])?.forEach((a) => {
        const arr = apptByUser.get(a.user_id) || [];
        arr.push(a);
        apptByUser.set(a.user_id, arr);
      });
      const stByUser = new Map<string, any[]>();
      (selftests as any[])?.forEach((s) => {
        const arr = stByUser.get(s.user_id) || [];
        arr.push(s);
        stByUser.set(s.user_id, arr);
      });

      return (attr as any[]).map((r) => ({
        user_id: r.user_id,
        anonymous_id: r.anonymous_id,
        last_touch_at: r.last_touch_at,
        appointments: apptByUser.get(r.user_id) || [],
        selftests: stByUser.get(r.user_id) || [],
      })) as AttributedUser[];
    },
  });

  const exportCSV = () => {
    if (!filtered.length) return;
    const rows = [
      ['slug', 'channel', 'campaign', 'destination', 'clicks', 'attributed_users', 'appointments', 'selftests'],
      ...filtered.map((r) => [
        r.slug,
        r.channel || '',
        r.campaign || '',
        r.destination_path || '',
        String(r.click_count || 0),
        String(r.attributed_users),
        String(r.appointments),
        String(r.selftests),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `link-case-trace-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={language === 'th' ? 'ค้นหา slug / campaign / channel' : 'Search slug / campaign / channel'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radio className={`h-3.5 w-3.5 ${live ? 'text-emerald-500 animate-pulse' : ''}`} />
          <span>{live ? (language === 'th' ? 'เรียลไทม์' : 'Live') : (language === 'th' ? 'กำลังเชื่อมต่อ…' : 'Connecting…')}</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {language === 'th' ? '🔗 การโยงลิงก์ → นัดคลินิก / HIVST (แบบเคสต่อเคส)' : '🔗 Link → Appointments / HIVST (case-by-case)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <p className="text-sm text-muted-foreground p-4">Loading…</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground p-4 text-center">{language === 'th' ? 'ไม่มีข้อมูล' : 'No data'}</p>
          )}
          <div className="divide-y">
            {filtered.map((r) => {
              const isOpen = expanded === r.id;
              return (
                <div key={r.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40 text-left"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">/go/{r.slug}</code>
                    {r.channel && <Badge variant="secondary" className="text-[10px]">{r.channel}</Badge>}
                    {r.campaign && <Badge variant="outline" className="text-[10px]">{r.campaign}</Badge>}
                    <span className="text-xs text-muted-foreground truncate flex-1">→ {r.destination_path}</span>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="text-muted-foreground">👥 {r.attributed_users}</span>
                      <span className="text-primary font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {r.appointments}
                      </span>
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <TestTube2 className="h-3 w-3" /> {r.selftests}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="bg-muted/20 px-4 py-3 space-y-2 border-t">
                      {!cases && <p className="text-xs text-muted-foreground">Loading cases…</p>}
                      {cases && cases.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          {language === 'th' ? 'ยังไม่มีผู้ใช้ที่ระบุตัวตนจากลิงก์นี้' : 'No identified users yet'}
                        </p>
                      )}
                      {cases && cases.length > 0 && (
                        <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
                          {cases.map((u) => (
                            <div
                              key={u.user_id}
                              className="text-xs bg-background border rounded p-2 flex items-start gap-2"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <code className="font-mono text-[10px] bg-muted px-1 rounded">{u.user_id.slice(0, 8)}</code>
                                  {u.last_touch_at && (
                                    <span className="text-muted-foreground text-[10px]">
                                      {format(new Date(u.last_touch_at), 'yyyy-MM-dd HH:mm')}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {u.appointments.map((a) => (
                                    <Badge key={a.id} variant="secondary" className="text-[10px] gap-1">
                                      <Calendar className="h-2.5 w-2.5" /> {a.status}
                                      <span className="opacity-60">· {format(new Date(a.created_at), 'MM/dd')}</span>
                                    </Badge>
                                  ))}
                                  {u.selftests.map((s) => (
                                    <Badge key={s.id} className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
                                      <TestTube2 className="h-2.5 w-2.5" /> {s.status}
                                      <span className="opacity-60">· {format(new Date(s.created_at), 'MM/dd')}</span>
                                    </Badge>
                                  ))}
                                  {u.appointments.length === 0 && u.selftests.length === 0 && (
                                    <span className="text-muted-foreground italic">
                                      {language === 'th' ? '— ยังไม่มี conversion' : '— no conversion yet'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
