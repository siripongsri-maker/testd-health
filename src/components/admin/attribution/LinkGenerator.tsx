import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, QrCode, Plus, ExternalLink, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/lib/i18n';
import { LinkCascade } from './LinkCascade';

const CHANNELS = ['facebook', 'instagram', 'line', 'x', 'tiktok', 'website', 'qr', 'outreach', 'partner', 'influencer', 'email', 'sms'];

const generateSlug = () => Math.random().toString(36).substring(2, 8);

export function LinkGenerator() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [expandedCascade, setExpandedCascade] = useState<string | null>(null);
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
      return data as any[];
    },
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {language === 'th' ? '🔗 สร้างลิงก์แคมเปญ' : '🔗 Campaign Link Generator'}
        </h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {language === 'th' ? 'สร้างลิงก์' : 'Create Link'}
        </Button>
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
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>→ {link.destination_path}</span>
                    <span className="font-medium">{link.click_count} clicks</span>
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
