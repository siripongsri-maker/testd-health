import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Link2, QrCode, Users, Copy, Check, ArrowRight, ArrowLeft, Shield, XCircle, Eye, ThumbsUp, CalendarCheck, CheckCircle2, TrendingUp, TestTube, Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = 'routine' | 'risk' | 'urgent';
type Mode = 'link' | 'qr' | 'session';

interface ImpactStats {
  invites_created: number;
  unique_opens: number;
  accepted_count: number;
  plans_to_test_count: number;
  booked_count: number;
  completed_count: number;
  active_invites: number;
  expired_invites: number;
  conversion_rate: number;
  pair_completed: number;
  booking_started_count: number;
  sessions_joined: number;
  raw_impact_score: number;
  adjusted_impact_score: number;
  suspicious_events_count: number;
}

const tones: { value: Tone; labelTh: string; labelEn: string; descTh: string; descEn: string; color: string }[] = [
  { value: 'routine', labelTh: 'ตรวจเป็นปกติ', labelEn: 'Routine check', descTh: 'ชวนตรวจสุขภาพเป็นประจำ', descEn: 'Regular health check-up', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' },
  { value: 'risk', labelTh: 'อาจมีความเสี่ยง', labelEn: 'Possible risk', descTh: 'มีเหตุการณ์ที่ควรตรวจ', descEn: 'Something happened, best to check', color: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400' },
  { value: 'urgent', labelTh: 'ควรตรวจเร็ว', labelEn: 'Urgent', descTh: 'ควรตรวจโดยเร็วที่สุด', descEn: 'Should get tested ASAP', color: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400' },
];

const modes: { value: Mode; labelTh: string; labelEn: string; descTh: string; descEn: string; icon: React.ElementType }[] = [
  { value: 'link', labelTh: 'ลิงก์ชวนตรวจ', labelEn: 'Invite Link', descTh: 'แชร์ผ่าน LINE หรือ SMS', descEn: 'Share via LINE or SMS', icon: Link2 },
  { value: 'qr', labelTh: 'QR Code', labelEn: 'QR Card', descTh: 'สแกนเปิดหน้าชวนตรวจ', descEn: 'Scan to open invite', icon: QrCode },
  { value: 'session', labelTh: 'ไปตรวจด้วยกัน', labelEn: 'Test Together', descTh: 'ชวนไปตรวจด้วยกัน จองหรือตรวจชุดตรวจ', descEn: 'Go together — book or self-test', icon: Users },
];

export default function InviteCreate() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [tone, setTone] = useState<Tone | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ code: string; session_code?: string; invite_id?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [myInvites, setMyInvites] = useState<any[]>([]);
  const [impact, setImpact] = useState<ImpactStats | null>(null);

  const isTh = language === 'th';

  if (!loading && !user) {
    navigate('/auth', { state: { from: '/invite' } });
    return null;
  }

  useEffect(() => {
    if (!user) return;
    supabase.rpc('get_partner_invite_stats').then(({ data }) => {
      if (data) setImpact(data as unknown as ImpactStats);
    });
    supabase
      .from('partner_invites')
      .select('id, code, invite_type, tone, status, created_at, expires_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setMyInvites(data); });
  }, [user, result]);

  const handleCreate = async () => {
    if (!tone || !mode) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_partner_invite', {
        p_invite_type: mode,
        p_tone: tone,
      });
      if (error) {
        if (error.message?.includes('daily_invite_limit')) {
          toast.error(isTh ? 'คุณสร้างคำชวนได้สูงสุด 5 ครั้งต่อวัน' : 'You can create up to 5 invites per day');
          return;
        }
        throw error;
      }
      setResult(data as any);
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      const { error } = await (supabase.rpc as any)('revoke_partner_invite', { p_invite_id: inviteId });
      if (error) throw error;
      toast.success(isTh ? 'ยกเลิกคำชวนแล้ว' : 'Invite revoked');
      setMyInvites(prev => prev.map(i => i.id === inviteId ? { ...i, status: 'revoked' } : i));
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke');
    }
  };

  const inviteUrl = result ? `${window.location.origin}/invite/${result.code}` : '';
  const sessionUrl = result?.session_code ? `${window.location.origin}/invite/session/${result.session_code}` : '';

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(isTh ? 'คัดลอกแล้ว' : 'Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLINE = (url: string) => {
    const text = isTh
      ? 'มีคนที่ห่วงใยสุขภาพของคุณชวนมาตรวจ ตรวจได้แบบส่วนตัว สะดวก ปลอดภัย'
      : 'Someone who cares about your health invited you to test. Private, convenient, safe.';
    window.open(`https://line.me/R/share?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  };

  const activeInvites = myInvites.filter(i => i.status === 'active' && new Date(i.expires_at) > new Date());

  // Impact funnel data
  const funnelSteps = impact ? [
    { icon: Heart, label: isTh ? 'ส่งคำชวน' : 'Sent', value: impact.invites_created, color: 'text-primary' },
    { icon: Eye, label: isTh ? 'เปิดดู' : 'Opened', value: impact.unique_opens, color: 'text-blue-500' },
    { icon: ThumbsUp, label: isTh ? 'ตอบรับ' : 'Accepted', value: impact.accepted_count, color: 'text-violet-500' },
    { icon: CalendarCheck, label: isTh ? 'ตั้งใจตรวจ' : 'Plans', value: impact.plans_to_test_count, color: 'text-amber-500' },
    { icon: Calendar, label: isTh ? 'จองแล้ว' : 'Booked', value: impact.booked_count, color: 'text-emerald-500' },
    { icon: CheckCircle2, label: isTh ? 'ตรวจแล้ว' : 'Done', value: impact.completed_count, color: 'text-emerald-600' },
  ] : [];

  return (
    <>
      <PageContainer>
        <PageHeader
          title={isTh ? 'ชวนคนที่คุณห่วงใยมาตรวจ' : 'Invite Someone to Test'}
          subtitle={isTh ? 'ส่งคำชวนแบบไม่ระบุตัวตน ปลอดภัย ไม่ตัดสิน' : 'Send an anonymous, safe, non-judgmental invite'}
        />

        {/* Impact Funnel Dashboard */}
        {impact && impact.invites_created > 0 && (
          <div className="mb-6 rounded-2xl bg-card border border-border p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">
                  {isTh ? 'ผลกระทบของคุณ' : 'Your Impact'}
                </h3>
              </div>
              {impact.conversion_rate > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1">
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-600">{impact.conversion_rate}%</span>
                </div>
              )}
            </div>
            
            {/* Funnel visualization */}
            <div className="space-y-1.5">
              {funnelSteps.map((step, i) => {
                const maxVal = funnelSteps[0].value || 1;
                const width = maxVal > 0 ? Math.max(20, (step.value / maxVal) * 100) : 20;
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", step.color)} />
                    <div className="flex-1 relative">
                      <div
                        className="h-7 rounded-md bg-primary/8 flex items-center px-2 transition-all"
                        style={{ width: `${width}%` }}
                      >
                        <span className="text-xs font-medium text-foreground whitespace-nowrap">{step.value}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">{step.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
              <span>{isTh ? `ใช้งาน: ${impact.active_invites}` : `Active: ${impact.active_invites}`}</span>
              <span>{isTh ? `หมดอายุ: ${impact.expired_invites}` : `Expired: ${impact.expired_invites}`}</span>
              {(impact.pair_completed || 0) > 0 && (
                <span>{isTh ? `ตรวจคู่สำเร็จ: ${impact.pair_completed}` : `Pairs done: ${impact.pair_completed}`}</span>
              )}
              <span className="font-medium">{isTh ? `คะแนน: ${impact.adjusted_impact_score}` : `Score: ${impact.adjusted_impact_score}`}</span>
            </div>
            {impact.suspicious_events_count > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {isTh ? 'กิจกรรมที่ซ้ำบางรายการอาจไม่ถูกนับ' : 'Some repeated activity may not be counted.'}
              </p>
            )}
          </div>
        )}

        {/* Privacy badge */}
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            {isTh ? 'ผู้รับจะไม่เห็นชื่อหรือข้อมูลของคุณ' : 'The recipient will never see your name or identity'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              s <= step ? "bg-primary" : "bg-muted"
            )} />
          ))}
        </div>

        {/* Step 1: Tone */}
        {step === 1 && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">
              {isTh ? 'เลือกโทนข้อความ' : 'Choose message tone'}
            </h3>
            {tones.map(t => (
              <button
                key={t.value}
                onClick={() => { setTone(t.value); setStep(2); }}
                className={cn(
                  "w-full text-left rounded-xl border-2 p-4 transition-all hover:scale-[1.01]",
                  tone === t.value ? "border-primary bg-primary/10" : "border-border bg-card",
                  t.color
                )}
              >
                <p className="font-semibold">{isTh ? t.labelTh : t.labelEn}</p>
                <p className="text-sm opacity-80">{isTh ? t.descTh : t.descEn}</p>
              </button>
            ))}

            {activeInvites.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  {isTh ? `คำชวนที่ยังใช้งานได้ (${activeInvites.length})` : `Active invites (${activeInvites.length})`}
                </h4>
                <div className="space-y-2">
                  {activeInvites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <div>
                        <p className="text-xs font-mono text-foreground">{inv.code}</p>
                        <p className="text-[10px] text-muted-foreground">{inv.invite_type} · {inv.tone}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(inv.id)}
                        className="h-7 text-xs text-destructive hover:text-destructive"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        {isTh ? 'ยกเลิก' : 'Revoke'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Mode */}
        {step === 2 && (
          <div className="space-y-3 animate-fade-in">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4" /> {isTh ? 'กลับ' : 'Back'}
            </button>
            <h3 className="text-lg font-semibold text-foreground">
              {isTh ? 'เลือกวิธีส่ง' : 'Choose delivery method'}
            </h3>
            {modes.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => { setMode(m.value); }}
                  className={cn(
                    "w-full text-left rounded-xl border-2 p-4 transition-all flex items-center gap-4 hover:scale-[1.01]",
                    mode === m.value ? "border-primary bg-primary/10" : "border-border bg-card"
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{isTh ? m.labelTh : m.labelEn}</p>
                    <p className="text-sm text-muted-foreground">{isTh ? m.descTh : m.descEn}</p>
                  </div>
                </button>
              );
            })}
            {mode && (
              <Button onClick={handleCreate} disabled={creating} className="w-full mt-4" size="lg">
                {creating ? (isTh ? 'กำลังสร้าง...' : 'Creating...') : (isTh ? 'สร้างคำชวน' : 'Create Invite')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Share */}
        {step === 3 && result && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {isTh ? 'คำชวนพร้อมแล้ว!' : 'Invite ready!'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isTh ? 'แชร์ลิงก์ด้านล่างให้คนที่คุณห่วงใย' : 'Share the link below with someone you care about'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground mb-1">{isTh ? 'ลิงก์ชวนตรวจ' : 'Invite Link'}</p>
              <p className="text-sm font-mono text-foreground break-all">{inviteUrl}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => handleCopy(inviteUrl)} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? (isTh ? 'คัดลอกแล้ว' : 'Copied') : (isTh ? 'คัดลอก' : 'Copy')}
              </Button>
              <Button onClick={() => handleShareLINE(inviteUrl)} className="gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)]">
                LINE
              </Button>
            </div>

            {mode === 'qr' && (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">{isTh ? 'QR Code' : 'QR Code'}</p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`}
                  alt="QR Code"
                  className="mx-auto rounded-lg"
                  loading="lazy"
                  width={200}
                  height={200}
                />
              </div>
            )}

            {result.session_code && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground mb-1">
                  {isTh ? 'ลิงก์ไปตรวจด้วยกัน' : 'Test Together Link'}
                </p>
                <p className="text-sm font-mono text-primary break-all">{sessionUrl}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => handleCopy(sessionUrl)}>
                  <Copy className="h-3 w-3 mr-1" /> {isTh ? 'คัดลอก' : 'Copy'}
                </Button>
              </div>
            )}

            <Button variant="outline" onClick={() => { setStep(1); setTone(null); setMode(null); setResult(null); }} className="w-full">
              {isTh ? 'สร้างคำชวนใหม่' : 'Create another invite'}
            </Button>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
