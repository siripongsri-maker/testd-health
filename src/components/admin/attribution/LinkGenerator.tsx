import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, QrCode, Plus, ExternalLink, Trash2, RefreshCw, ChevronDown, ChevronUp, Radio, FileDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/lib/i18n';
import { LinkCascade } from './LinkCascade';
import { generateLinkReportCsv, downloadCsv } from '@/lib/linkReport';

const CHANNELS = ['facebook', 'instagram', 'line', 'x', 'tiktok', 'website', 'qr', 'outreach', 'partner', 'influencer', 'email', 'sms'];

const generateSlug = () => Math.random().toString(36).substring(2, 8);

export function LinkGenerator() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [expandedCascade, setExpandedCascade] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('tracked-links-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracked_links' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tracked-links'] });
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
  const [form, setForm] = useState({
    slug: generateSlug(),
    destination_path: '/booking',
    campaign: '',
    channel: '',
    source: '',
    medium: '',
    content: '',
    term: '',
    partner_name: '',
    service_focus: '',
    branch_focus: '',
    label: '',
  });

  const { data: links, isLoading } = useQuery({
    queryKey: ['tracked-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracked_links')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data as any[]) || [];
      if (!rows.length) return rows;

      // Attach attributed_users / appointments / selftests per link (same logic as Trace tab)
      const linkIds = rows.map((r) => r.id);
      const { data: attr } = await supabase
        .from('visitor_attribution')
        .select('user_id, last_touch_link_id')
        .in('last_touch_link_id', linkIds)
        .not('user_id', 'is', null)
        .limit(10000);

      const usersByLink = new Map<string, Set<string>>();
      (attr as any[])?.forEach((r) => {
        const set = usersByLink.get(r.last_touch_link_id) || new Set<string>();
        set.add(r.user_id);
        usersByLink.set(r.last_touch_link_id, set);
      });

      const allUsers = Array.from(new Set((attr as any[])?.map((r) => r.user_id) || []));
      const apptByUser = new Map<string, number>();
      const stByUser = new Map<string, number>();
      const chunk = <T,>(arr: T[], n: number) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
        return out;
      };
      for (const batch of chunk(allUsers, 500)) {
        const [{ data: a }, { data: s }] = await Promise.all([
          supabase.from('appointments').select('user_id').in('user_id', batch),
          supabase.from('hiv_selftest_requests').select('user_id').in('user_id', batch),
        ]);
        (a as any[])?.forEach((r) => apptByUser.set(r.user_id, (apptByUser.get(r.user_id) || 0) + 1));
        (s as any[])?.forEach((r) => stByUser.set(r.user_id, (stByUser.get(r.user_id) || 0) + 1));
      }

      return rows.map((l) => {
        const users = Array.from(usersByLink.get(l.id) || []);
        let appts = 0, selftests = 0;
        users.forEach((u) => {
          appts += apptByUser.get(u) || 0;
          selftests += stByUser.get(u) || 0;
        });
        return { ...l, attributed_users: users.length, appointment_count: appts, selftest_count: selftests };
      });
    },
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tracked_links').insert({
        ...form,
        campaign: form.campaign || null,
        channel: form.channel || null,
        source: form.source || null,
        medium: form.medium || null,
        content: form.content || null,
        term: form.term || null,
        partner_name: form.partner_name || null,
        service_focus: form.service_focus || null,
        branch_focus: form.branch_focus || null,
        label: form.label || null,
        created_by: user?.id || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Link created');
      queryClient.invalidateQueries({ queryKey: ['tracked-links'] });
      setShowForm(false);
      setForm({ ...form, slug: generateSlug(), campaign: '', channel: '', source: '', medium: '', content: '', term: '', partner_name: '', service_focus: '', branch_focus: '', label: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tracked_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['tracked-links'] });
    },
  });

  const baseUrl = window.location.origin;
  const getFullUrl = (slug: string) => `${baseUrl}/go/${slug}`;

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(getFullUrl(slug));
    toast.success('Copied!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">
          {language === 'th' ? '🔗 สร้างลิงก์แคมเปญ' : '🔗 Campaign Link Generator'}
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio className={`h-3.5 w-3.5 ${live ? 'text-emerald-500 animate-pulse' : ''}`} />
            <span>{live ? (language === 'th' ? 'เรียลไทม์' : 'Live') : (language === 'th' ? 'กำลังเชื่อมต่อ…' : 'Connecting…')}</span>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {language === 'th' ? 'สร้างลิงก์' : 'Create Link'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Slug</Label>
                <div className="flex gap-2">
                  <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="abc123" />
                  <Button variant="outline" size="icon" onClick={() => setForm({ ...form, slug: generateSlug() })}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{getFullUrl(form.slug)}</p>
              </div>
              <div>
                <Label>{language === 'th' ? 'ปลายทาง' : 'Destination'}</Label>
                <Select value={form.destination_path} onValueChange={v => setForm({ ...form, destination_path: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="/booking">Booking</SelectItem>
                    <SelectItem value="/">Home</SelectItem>
                    <SelectItem value="/info">Info</SelectItem>
                    <SelectItem value="/harm-reduction">Harm Reduction</SelectItem>
                    <SelectItem value="/hiv-selftest">HIV Self Test</SelectItem>
                    <SelectItem value="/virtual">Virtual Space</SelectItem>
                    <SelectItem value="/prevention-match">Prevention Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Campaign</Label>
                <Input value={form.campaign} onChange={e => setForm({ ...form, campaign: e.target.value })} placeholder="pride-2026" />
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="ig_story" />
              </div>
              <div>
                <Label>Medium</Label>
                <Input value={form.medium} onChange={e => setForm({ ...form, medium: e.target.value })} placeholder="social, cpc, qr" />
              </div>
              <div>
                <Label>{language === 'th' ? 'พาร์ทเนอร์ / KOL' : 'Partner / KOL'}</Label>
                <Input value={form.partner_name} onChange={e => setForm({ ...form, partner_name: e.target.value })} placeholder="@influencer" />
              </div>
              <div>
                <Label>{language === 'th' ? 'หมายเหตุ' : 'Label'}</Label>
                <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Custom note" />
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.slug}>
              {createMutation.isPending ? 'Creating...' : language === 'th' ? 'สร้างลิงก์' : 'Create Link'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Links list */}
      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {links?.map((link: any) => (
          <Card key={link.id} className="overflow-hidden">
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">/go/{link.slug}</code>
                    {link.channel && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{link.channel}</span>}
                    {link.campaign && <span className="text-xs bg-accent px-1.5 py-0.5 rounded">{link.campaign}</span>}
                    {link.partner_name && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{link.partner_name}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>→ {link.destination_path}</span>
                    <span className="font-medium">{link.click_count} clicks</span>
                    <span title={language === 'th' ? 'ผู้ใช้ที่ระบุตัวตน' : 'Identified users'}>
                      👥 {link.attributed_users ?? 0}
                    </span>
                    <span className="text-primary font-medium" title={language === 'th' ? 'นัดคลินิก' : 'Clinic appointments'}>
                      🗓 {link.appointment_count ?? 0}
                    </span>
                    <span className="text-emerald-600 font-medium" title="HIVST requests">
                      🧪 {link.selftest_count ?? 0}
                    </span>
                    {link.label && <span>• {link.label}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant={expandedCascade === link.id ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setExpandedCascade(expandedCascade === link.id ? null : link.id)}
                    title={language === 'th' ? 'ดูเส้นทาง (Cascade)' : 'View cascade'}
                  >
                    {expandedCascade === link.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(link.slug)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={language === 'th' ? 'ดาวน์โหลดรายงาน CSV' : 'Download report (CSV)'}
                    onClick={async () => {
                      try {
                        toast.info(language === 'th' ? 'กำลังสร้างรายงาน…' : 'Building report…');
                        const csv = await generateLinkReportCsv(link);
                        const stamp = new Date().toISOString().slice(0, 10);
                        downloadCsv(`link-report_${link.slug}_${stamp}.csv`, csv);
                        toast.success(language === 'th' ? 'ดาวน์โหลดแล้ว' : 'Report downloaded');
                      } catch (e: any) {
                        toast.error(e.message || 'Failed to generate report');
                      }
                    }}
                  >
                    <FileDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowQR(showQR === link.id ? null : link.id)}>
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(link.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {showQR === link.id && (
                <div className="mt-3 flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG value={getFullUrl(link.slug)} size={160} />
                </div>
              )}
              {expandedCascade === link.id && (
                <LinkCascade
                  linkId={link.id}
                  clickCount={link.click_count || 0}
                  destinationPath={link.destination_path}
                />
              )}
            </CardContent>
          </Card>
        ))}
        {links?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {language === 'th' ? 'ยังไม่มีลิงก์ — สร้างลิงก์แรกเลย!' : 'No links yet — create your first one!'}
          </p>
        )}
      </div>
    </div>
  );
}
