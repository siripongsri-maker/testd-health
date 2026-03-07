import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Play, CheckCircle2, Clock, Timer, Calendar, TestTube, Heart, ThumbsUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { setInviteAttribution } from "@/lib/inviteAttribution";
import { toast } from "sonner";

function getParticipantSessionId(): string {
  let sid = sessionStorage.getItem('invite_participant_sid');
  if (!sid) {
    sid = `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('invite_participant_sid', sid);
  }
  return sid;
}

const TIMER_SECONDS = 15 * 60;

type PairState = 'waiting' | 'accepted' | 'plans_to_test' | 'booking_started' | 'booked' | 'active' | 'completed';

const STATUS_ORDER: Record<PairState, number> = {
  waiting: 0, accepted: 1, plans_to_test: 2, booking_started: 3, booked: 4, active: 5, completed: 6
};

const STATE_LABELS: Record<PairState, { th: string; en: string }> = {
  waiting: { th: 'รอผู้เข้าร่วม', en: 'Waiting for partner' },
  accepted: { th: 'มีคนเข้าร่วมแล้ว', en: 'Partner joined' },
  plans_to_test: { th: 'ตั้งใจจะไปตรวจ', en: 'Planning to test' },
  booking_started: { th: 'กำลังจอง', en: 'Booking in progress' },
  booked: { th: 'จองแล้ว', en: 'Booked' },
  active: { th: 'กำลังตรวจ', en: 'Testing in progress' },
  completed: { th: 'เสร็จสิ้น', en: 'Completed' },
};

export default function InviteSession() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [joined, setJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionCode) return;
    const { data: sess } = await supabase
      .from('partner_test_sessions')
      .select('*, partner_invites!inner(code, id)')
      .eq('session_code', sessionCode)
      .maybeSingle();

    if (sess) {
      setSession(sess);
      const invite = (sess as any).partner_invites;
      setInviteCode(invite?.code || null);
      setInviteId(invite?.id || null);

      if (sess.status === 'active' && sess.started_at) {
        const elapsed = Math.floor((Date.now() - new Date(sess.started_at).getTime()) / 1000);
        const remaining = Math.max(0, TIMER_SECONDS - elapsed);
        setTimeLeft(remaining);
        if (remaining > 0) setTimerActive(true);
      }
      if (sess.status === 'completed') {
        setTimeLeft(0);
        setTimerActive(false);
      }
    }

    const { data: parts } = await supabase
      .from('partner_test_session_participants')
      .select('id, participant_session_id, joined_at')
      .eq('session_id', sess?.id);
    if (parts) {
      setParticipants(parts);
      const mySid = getParticipantSessionId();
      if (parts.some(p => p.participant_session_id === mySid)) setJoined(true);
    }

    setLoading(false);
  }, [sessionCode]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Realtime subscription for live pair coordination
  useEffect(() => {
    if (!session?.id) return;
    const channel = supabase
      .channel(`session-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_test_sessions', filter: `id=eq.${session.id}` }, () => loadSession())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'partner_test_session_participants', filter: `session_id=eq.${session.id}` }, () => loadSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, loadSession]);

  // Timer
  useEffect(() => {
    if (!timerActive) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimerActive(false);
          if (session?.id) {
            supabase.from('partner_test_sessions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', session.id).then();
            if (inviteCode) {
              supabase.rpc('record_partner_invite_event', { p_code: inviteCode, p_visitor_session_id: getParticipantSessionId(), p_event_type: 'timer_complete' }).then();
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [timerActive, session?.id, inviteCode]);

  const handleJoin = async () => {
    if (!sessionCode) return;
    const sid = getParticipantSessionId();
    try {
      const { data, error } = await supabase.rpc('join_partner_session' as any, {
        p_session_code: sessionCode,
        p_participant_sid: sid,
      });
      if (error) {
        if (error.message?.includes('session_full')) {
          toast.error(isTh ? 'เซสชันเต็มแล้ว' : 'Session is full');
        } else if (error.message?.includes('join_rate_limited')) {
          toast.error(isTh ? 'คุณเข้าร่วมบ่อยเกินไป กรุณารอสักครู่' : 'Too many joins. Please wait.');
        } else throw error;
        return;
      }
      setJoined(true);
      // Set invite attribution for booking flow
      if (inviteCode && inviteId) {
        setInviteAttribution({
          invite_code: inviteCode,
          invite_id: inviteId,
          session_code: sessionCode,
          session_id: session?.id,
          attribution_type: 'pair_session',
          visitor_session_id: sid,
          set_at: Date.now(),
        });
      }
      if (inviteCode) {
        await supabase.rpc('record_partner_invite_event', { p_code: inviteCode, p_visitor_session_id: sid, p_event_type: 'join_session' });
      }
      loadSession();
    } catch (err: any) {
      toast.error(err.message || 'Failed to join');
    }
  };

  const handleUpdateState = async (newStatus: PairState) => {
    if (!session?.id) return;
    const current = session.status as PairState;
    if (STATUS_ORDER[newStatus] <= STATUS_ORDER[current]) return;
    
    await supabase.from('partner_test_sessions').update({ status: newStatus }).eq('id', session.id);
    if (inviteCode) {
      await supabase.rpc('record_partner_invite_event', { p_code: inviteCode, p_visitor_session_id: getParticipantSessionId(), p_event_type: `pair_${newStatus}` });
    }
    loadSession();
  };

  const handleStartTimer = async () => {
    if (!session?.id) return;
    await supabase.from('partner_test_sessions').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', session.id);
    setTimerActive(true);
    setTimeLeft(TIMER_SECONDS);
    if (inviteCode) {
      await supabase.rpc('record_partner_invite_event', { p_code: inviteCode, p_visitor_session_id: getParticipantSessionId(), p_event_type: 'timer_start' });
    }
    loadSession();
  };

  const handleGoToBooking = () => {
    if (inviteCode) {
      supabase.rpc('record_partner_invite_event', { p_code: inviteCode, p_visitor_session_id: getParticipantSessionId(), p_event_type: 'booking_started' }).then();
    }
    navigate('/booking');
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">{isTh ? 'ไม่พบเซสชัน' : 'Session not found'}</h1>
        </div>
      </div>
    );
  }

  const status = session.status as PairState;
  const isTimerDone = status === 'completed' || (status === 'active' && timeLeft === 0);
  const isTimerRunning = status === 'active' && timeLeft > 0;
  const isPairPhase = ['waiting', 'accepted', 'plans_to_test', 'booking_started', 'booked'].includes(status);
  const progress = status === 'active' || status === 'completed' ? ((TIMER_SECONDS - timeLeft) / TIMER_SECONDS) * 100 : 0;

  const pairSteps: { status: PairState; labelTh: string; labelEn: string; icon: React.ElementType }[] = [
    { status: 'accepted', labelTh: 'ตอบรับแล้ว', labelEn: 'Accepted', icon: ThumbsUp },
    { status: 'plans_to_test', labelTh: 'ตั้งใจจะไปตรวจ', labelEn: 'Plans to test', icon: Heart },
    { status: 'booked', labelTh: 'จองแล้ว', labelEn: 'Booked', icon: Calendar },
  ];

  // Anonymous session state description
  const sessionStateLabel = STATE_LABELS[status] || STATE_LABELS.waiting;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-xl font-bold text-foreground">
          {isTh ? 'ไปตรวจด้วยกัน' : 'Test Together'}
        </h1>

        {/* Anonymous session status banner */}
        <div className={cn(
          "rounded-xl border px-4 py-3 text-sm font-medium",
          status === 'completed' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" :
          status === 'active' ? "bg-primary/10 border-primary/30 text-primary" :
          "bg-muted/50 border-border text-muted-foreground"
        )}>
          <p>{isTh ? sessionStateLabel.th : sessionStateLabel.en}</p>
          <p className="text-xs mt-1 opacity-70">
            {participants.length > 0
              ? (isTh ? `${participants.length} คนเข้าร่วม` : `${participants.length} ${participants.length === 1 ? 'person' : 'people'} joined`)
              : (isTh ? 'ยังไม่มีผู้เข้าร่วม' : 'No participants yet')}
          </p>
        </div>

        {/* Pair commitment flow */}
        {isPairPhase && (
          <div className="space-y-4">
            {/* Participants */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">
                  {isTh ? `ผู้เข้าร่วม (${participants.length}/${session.max_participants})` : `Participants (${participants.length}/${session.max_participants})`}
                </span>
              </div>
              <div className="space-y-2">
                {participants.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {i + 1}
                    </div>
                    <span className="text-muted-foreground">
                      {isTh ? `ผู้เข้าร่วม ${i + 1}` : `Participant ${i + 1}`}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                  </div>
                ))}
                {participants.length < session.max_participants && (
                  <div className="flex items-center gap-2 text-sm opacity-40">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
                      ?
                    </div>
                    <span className="text-muted-foreground">{isTh ? 'รอเข้าร่วม...' : 'Waiting...'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pair progress steps */}
            {joined && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {isTh ? 'ความคืบหน้า' : 'Progress'}
                </p>
                <div className="space-y-2">
                  {pairSteps.map(step => {
                    const Icon = step.icon;
                    const isReached = STATUS_ORDER[status] >= STATUS_ORDER[step.status];
                    const canAdvance = STATUS_ORDER[step.status] === STATUS_ORDER[status] + 1;

                    return (
                      <button
                        key={step.status}
                        onClick={() => canAdvance ? handleUpdateState(step.status) : null}
                        disabled={!canAdvance}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                          isReached ? "border-primary/30 bg-primary/5" :
                          canAdvance ? "border-primary/50 bg-background hover:bg-primary/5 cursor-pointer" :
                          "border-border bg-muted/30 opacity-50"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                          isReached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {isReached ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </div>
                        <span className={cn("text-sm font-medium", isReached ? "text-primary" : "text-foreground")}>
                          {isTh ? step.labelTh : step.labelEn}
                        </span>
                        {canAdvance && <ArrowRight className="h-4 w-4 ml-auto text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Join */}
            {!joined && status === 'waiting' && participants.length < session.max_participants && (
              <Button onClick={handleJoin} className="w-full" size="lg">
                <Users className="h-5 w-5 mr-2" />
                {isTh ? 'เข้าร่วม' : 'Join Session'}
              </Button>
            )}

            {/* Action buttons */}
            {joined && (
              <div className="space-y-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleGoToBooking}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Calendar className="h-5 w-5" />
                  {isTh ? 'นัดตรวจด้วยกัน' : 'Book together'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/hiv-selftest')}
                  className="w-full gap-2"
                  size="lg"
                >
                  <TestTube className="h-5 w-5" />
                  {isTh ? 'ขอชุดตรวจ' : 'Get self-test kit'}
                </Button>
                {participants.length >= 1 && STATUS_ORDER[status] >= STATUS_ORDER['accepted'] && (
                  <Button onClick={handleStartTimer} className="w-full gap-2" size="lg">
                    <Play className="h-5 w-5" />
                    {isTh ? 'ตรวจชุดตรวจพร้อมกัน (15 นาที)' : 'Self-test together (15 min)'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timer phase */}
        {(isTimerRunning || isTimerDone) && (
          <div className="space-y-4">
            <div className="relative mx-auto w-48 h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="stroke-muted" />
                <circle
                  cx="50" cy="50" r="45" fill="none" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  className={cn(
                    "transition-all duration-1000",
                    isTimerDone ? "stroke-emerald-500" : "stroke-primary"
                  )}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isTimerDone ? (
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                ) : (
                  <>
                    <Timer className="h-6 w-6 text-primary mb-1" />
                    <span className="text-3xl font-bold font-mono text-foreground">{formatTime(timeLeft)}</span>
                  </>
                )}
              </div>
            </div>

            <div className={cn(
              "rounded-xl border px-4 py-3",
              isTimerDone ? "bg-emerald-500/10 border-emerald-500/30" : "bg-primary/10 border-primary/30"
            )}>
              <p className="font-medium text-foreground">
                {isTimerDone ? (isTh ? '✅ เสร็จสิ้น! อ่านผลได้เลย' : '✅ Done! You can read your result now') :
                 (isTh ? '⏱ กำลังจับเวลา...' : '⏱ Timer running...')}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {isTh
            ? 'ปลอดภัย ส่วนตัว ไม่ระบุตัวตน'
            : 'Safe, private, anonymous.'}
        </p>
      </div>
    </div>
  );
}
