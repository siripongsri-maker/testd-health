import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Heart, Link2, QrCode, Users, Copy, Check, ArrowRight, ArrowLeft,
  Shield, XCircle, Eye, ThumbsUp, CalendarCheck, CheckCircle2,
  TrendingUp, Calendar, MessageSquare, Phone, Loader2, Bug
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = 'routine' | 'risk' | 'urgent';
type Mode = 'link' | 'qr' | 'session' | 'sms';

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

const modes: { value: Mode; labelTh: string; labelEn: string; descTh: string; descEn: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { value: 'link', labelTh: 'ลิงก์ชวนตรวจ', labelEn: 'Invite Link', descTh: 'แชร์ผ่าน LINE หรือ SMS', descEn: 'Share via LINE or SMS', icon: Link2 },
  { value: 'qr', labelTh: 'QR Code', labelEn: 'QR Card', descTh: 'สแกนเปิดหน้าชวนตรวจ', descEn: 'Scan to open invite', icon: QrCode },
  { value: 'session', labelTh: 'ไปตรวจด้วยกัน', labelEn: 'Test Together', descTh: 'ชวนไปตรวจด้วยกัน จองหรือตรวจชุดตรวจ', descEn: 'Go together — book or self-test', icon: Users },
  { value: 'sms', labelTh: 'ส่ง SMS แบบไม่ระบุตัวตน', labelEn: 'Send anonymous SMS', descTh: 'ให้ testD ส่งคำชวนแทนคุณ', descEn: 'Let testD send the invite for you', icon: MessageSquare },
];

export default function InviteCreate() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [tone, setTone] = useState<Tone | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ code: string; session_code?: string; invite_id?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [myInvites, setMyInvites] = useState<any[]>([]);
  const [impact, setImpact] = useState<ImpactStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<{ status: string; relay_id?: string; error?: string } | null>(null);

  const isTh = language === 'th';

  if (!loading && !user) {
    navigate('/auth', { state: { from: '/invite' } });
    return null;
  }

  useEffect(() => {
    if (!user) return;
    // Check admin role
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => { if (data) setIsAdmin(true); });
    // Load stats
    supabase.rpc('get_partner_invite_stats').then(({ data }) => {
      if (data) setImpact(data as unknown as ImpactStats);
    });
    supabase
      .from('partner_invites')
      .select('id, code, invite_type, tone, status, created_at, expires_at, is_test_mode')
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
        p_invite_type: mode === 'sms' ? 'sms' : mode,
        p_tone: tone,
        p_is_test_mode: testMode,
      } as any);
      if (error) {
        if (error.message?.includes('daily_invite_limit')) {
          toast.error(isTh ? 'คุณสร้างคำชวนครบจำนวนจำกัดต่อวันแล้ว' : 'Daily invite limit reached');
          return;
        }
        if (error.message?.includes('sms_not_available')) {
          toast.error(isTh ? 'SMS ยังไม่พร้อมสำหรับบัญชีของคุณ' : 'SMS is not available for your account yet');
          return;
        }
        throw error;
      }
      setResult(data as any);
      if (mode === 'sms') {
        setStep(4); // SMS phone input step
      } else {
        setStep(3);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const handleSendSms = async () => {
    if (!result?.invite_id || !smsPhone.trim()) return;
    setSmsSending(true);
    setSmsResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-partner-sms', {
        body: {
          invite_id: result.invite_id,
          phone: smsPhone.trim(),
          language,
          is_test_mode: testMode,
        },
      });
      if (error) throw error;
      setSmsResult(data as any);
      if (data?.status === 'sent') {
        toast.success(isTh ? 'ส่ง SMS สำเร็จ!' : 'SMS sent!');
      } else if (data?.status === 'failed' && data?.reason === 'no_sms_provider_configured') {
        toast.warning(isTh ? 'ระบบ SMS ยังไม่ได้ตั้งค่า Provider' : 'SMS provider not configured yet');
      } else {
        toast.error(isTh ? 'ส่ง SMS ไม่สำเร็จ' : 'SMS send failed');
      }
    } catch (err: any) {
      if (err?.message?.includes('relay_cooldown')) {
        toast.error(isTh ? 'เบอร์นี้ถูกส่งไปแล้วภายใน 24 ชม.' : 'This number was already contacted in the last 24h');
      } else {
        toast.error(err.message || 'Failed to send SMS');
      }
    } finally {
      setSmsSending(false);
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

  const funnelSteps = impact ? [
    { icon: Heart, label: isTh ? 'ส่งคำชวน' : 'Sent', value: impact.invites_created, color: 'text-primary' },
    { icon: Eye, label: isTh ? 'เปิดดู' : 'Opened', value: impact.unique_opens, color: 'text-blue-500' },
    { icon: ThumbsUp, label: isTh ? 'ตอบรับ' : 'Accepted', value: impact.accepted_count, color: 'text-violet-500' },
    { icon: CalendarCheck, label: isTh ? 'ตั้งใจตรวจ' : 'Plans', value: impact.plans_to_test_count, color: 'text-amber-500' },
    { icon: Calendar, label: isTh ? 'จองแล้ว' : 'Booked', value: impact.booked_count, color: 'text-emerald-500' },
    { icon: CheckCircle2, label: isTh ? 'ตรวจแล้ว' : 'Done', value: impact.completed_count, color: 'text-emerald-600' },
  ] : [];

  const visibleModes = modes.filter(m => {
    if (m.value === 'sms' && !isAdmin) return false; // SMS visible to admin only during testing phase
    return true;
  });

  return (
    <>
      <PageContainer>
        <PageHeader
          title={isTh ? 'ชวนคนที่คุณห่วงใยมาตรวจ' : 'Invite Someone to Test'}
          subtitle={isTh ? 'ส่งคำชวนแบบไม่ระบุตัวตน ปลอดภัย ไม่ตัดสิน' : 'Send an anonymous, safe, non-judgmental invite'}
        />

        {/* Admin test mode toggle */}
        {isAdmin && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5">
            <Bug className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {isTh ? 'โหมดทดสอบ Admin' : 'Admin Test Mode'}
              </p>
              <p className="text-[10px] text-amber-600/70">
                {isTh ? 'ข้ามขีดจำกัด ข้อมูลแยกจากเมตริกจริง' : 'Bypasses limits, excluded from production metrics'}
              </p>
            </div>
            <button
              onClick={() => setTestMode(!testMode)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                testMode ? "bg-amber-500" : "bg-muted"
              )}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                testMode && "translate-x-5"
              )} />
            </button>
          </div>
        )}

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
            <div className="space-y-1.5">
              {funnelSteps.map((s) => {
                const maxVal = funnelSteps[0].value || 1;
                const width = maxVal > 0 ? Math.max(20, (s.value / maxVal) * 100) : 20;
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", s.color)} />
                    <div className="flex-1 relative">
                      <div className="h-7 rounded-md bg-primary/8 flex items-center px-2 transition-all" style={{ width: `${width}%` }}>
                        <span className="text-xs font-medium text-foreground whitespace-nowrap">{s.value}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">{s.label}</span>
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
              s <= Math.min(step, 3) ? "bg-primary" : "bg-muted"
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
                        <p className="text-xs font-mono text-foreground">
                          {inv.code}
                          {inv.is_test_mode && <span className="ml-1 text-amber-500">[TEST]</span>}
                        </p>
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
            {visibleModes.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={cn(
                    "w-full text-left rounded-xl border-2 p-4 transition-all flex items-center gap-4 hover:scale-[1.01]",
                    mode === m.value ? "border-primary bg-primary/10" : "border-border bg-card"
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{isTh ? m.labelTh : m.labelEn}</p>
                    <p className="text-sm text-muted-foreground">{isTh ? m.descTh : m.descEn}</p>
                  </div>
                  {m.value === 'sms' && (
                    <span className="text-[10px] rounded-full bg-amber-500/10 text-amber-600 px-2 py-0.5">
                      {isAdmin ? 'Admin' : 'Trusted'}
                    </span>
                  )}
                </button>
              );
            })}
            {mode && (
              <div className="space-y-2 mt-4">
                {mode === 'sms' && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs text-muted-foreground">
                      {isTh ? 'ผู้รับจะเห็นเพียงคำชวนจาก testD ไม่เห็นชื่อหรือข้อมูลของคุณ' : 'The recipient will only see an invitation from testD, not your identity'}
                    </p>
                  </div>
                )}
                <Button onClick={handleCreate} disabled={creating} className="w-full" size="lg">
                  {creating ? (isTh ? 'กำลังสร้าง...' : 'Creating...') : (isTh ? 'สร้างคำชวน' : 'Create Invite')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Share (link/qr/session) */}
        {step === 3 && result && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {isTh ? 'คำชวนพร้อมแล้ว!' : 'Invite ready!'}
              </h3>
              {testMode && (
                <p className="text-xs text-amber-600 mt-1">[TEST MODE]</p>
              )}
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
                <p className="text-sm text-muted-foreground mb-3">QR Code</p>
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

            <Button variant="outline" onClick={() => { setStep(1); setTone(null); setMode(null); setResult(null); setSmsResult(null); }} className="w-full">
              {isTh ? 'สร้างคำชวนใหม่' : 'Create another invite'}
            </Button>
          </div>
        )}

        {/* Step 4: SMS phone input */}
        {step === 4 && result && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {isTh ? 'กลับ' : 'Back'}
            </button>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {isTh ? 'ส่ง SMS แบบไม่ระบุตัวตน' : 'Send anonymous SMS'}
              </h3>
              {testMode && <p className="text-xs text-amber-600 mt-1">[TEST MODE]</p>}
              <p className="text-sm text-muted-foreground mt-1">
                {isTh ? 'ผู้รับจะเห็นเพียงคำชวนจาก testD' : 'The recipient will only see an invitation from testD'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {isTh ? 'เบอร์โทรผู้รับ' : 'Recipient phone number'}
                </label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    type="tel"
                    placeholder={isTh ? '08x-xxx-xxxx' : '08x-xxx-xxxx'}
                    value={smsPhone}
                    onChange={e => setSmsPhone(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {isTh ? 'เบอร์จะไม่ถูกเก็บ จะถูกลบหลังส่ง' : 'Phone number is not stored after sending'}
                </p>
              </div>

              <Button
                onClick={handleSendSms}
                disabled={smsSending || !smsPhone.trim()}
                className="w-full"
                size="lg"
              >
                {smsSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                {smsSending ? (isTh ? 'กำลังส่ง...' : 'Sending...') : (isTh ? 'ส่ง SMS' : 'Send SMS')}
              </Button>
            </div>

            {smsResult && (
              <div className={cn(
                "rounded-xl border p-4",
                smsResult.status === 'sent' ? "border-emerald-500/30 bg-emerald-500/10" :
                smsResult.status === 'failed' ? "border-amber-500/30 bg-amber-500/10" :
                "border-red-500/30 bg-red-500/10"
              )}>
                <p className="text-sm font-medium text-foreground">
                  {smsResult.status === 'sent' ? (isTh ? '✅ ส่ง SMS สำเร็จ!' : '✅ SMS sent successfully!') :
                   smsResult.status === 'blocked' ? (isTh ? '⛔ ถูกบล็อก: เบอร์นี้ถูกส่งไปแล้วเร็วเกินไป' : '⛔ Blocked: too soon for this number') :
                   (isTh ? '⚠️ ส่งไม่สำเร็จ' : '⚠️ Send failed')}
                </p>
                {smsResult.error && (
                  <p className="text-xs text-muted-foreground mt-1">{smsResult.error}</p>
                )}
              </div>
            )}

            {/* Also show the link for manual sharing */}
            <div className="rounded-xl border border-border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">{isTh ? 'หรือคัดลอกลิงก์แชร์เอง' : 'Or copy the link to share manually'}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-foreground break-all flex-1">{inviteUrl}</p>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(inviteUrl)} className="shrink-0 h-7">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Button variant="outline" onClick={() => { setStep(1); setTone(null); setMode(null); setResult(null); setSmsResult(null); setSmsPhone(''); }} className="w-full">
              {isTh ? 'สร้างคำชวนใหม่' : 'Create another invite'}
            </Button>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
