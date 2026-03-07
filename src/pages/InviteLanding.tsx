import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Heart, TestTube, Calendar, Users, Clock, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { setInviteAttribution } from "@/lib/inviteAttribution";

// Get or create anonymous session id
function getVisitorSessionId(): string {
  let sid = localStorage.getItem('invite_visitor_sid');
  if (!sid) {
    sid = `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('invite_visitor_sid', sid);
  }
  return sid;
}

export default function InviteLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [expired, setExpired] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const load = async () => {
      // Fetch invite - include expired/revoked for messaging
      const { data, error } = await supabase
        .from('partner_invites')
        .select('id, code, invite_type, tone, expires_at, is_active, status')
        .eq('code', code)
        .maybeSingle();

      if (error || !data) {
        setExpired(true);
        setLoading(false);
        return;
      }

      // Check lifecycle: expired, revoked, or inactive
      const isExpiredOrRevoked = 
        data.status === 'expired' || 
        data.status === 'revoked' || 
        !data.is_active || 
        new Date(data.expires_at) < new Date();

      if (isExpiredOrRevoked) {
        setExpired(true);
        setLoading(false);
        return;
      }

      setInvite(data);

      // If session type, fetch session code
      if (data.invite_type === 'session') {
        const { data: sess } = await supabase
          .from('partner_test_sessions')
          .select('session_code')
          .eq('host_invite_id', data.id)
          .maybeSingle();
        if (sess) setSessionCode(sess.session_code);
      }

      // Set attribution context for booking flow
      setInviteAttribution({
        invite_code: code,
        invite_id: data.id,
        attribution_type: data.invite_type === 'qr' ? 'invite_qr' : 'invite_link',
        visitor_session_id: getVisitorSessionId(),
        set_at: Date.now(),
      });

      // Record view event
      try {
        await supabase.rpc('record_partner_invite_event', {
          p_code: code,
          p_visitor_session_id: getVisitorSessionId(),
          p_event_type: 'view',
        });
      } catch {}

      setLoading(false);
    };
    load();
  }, [code]);

  const recordEvent = async (eventType: string) => {
    if (!code) return;
    try {
      await supabase.rpc('record_partner_invite_event', {
        p_code: code,
        p_visitor_session_id: getVisitorSessionId(),
        p_event_type: eventType,
      });
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {isTh ? 'คำเชิญนี้หมดอายุแล้ว' : 'This invite is no longer active'}
          </h1>
          <p className="text-muted-foreground">
            {isTh ? 'คำชวนนี้หมดอายุแล้ว แต่คุณยังสามารถตรวจสุขภาพได้' : 'This invite has expired, but you can still get tested'}
          </p>
          <div className="space-y-3 pt-4">
            <Button onClick={() => navigate('/hiv-selftest')} className="w-full" size="lg">
              <TestTube className="h-5 w-5 mr-2" />
              {isTh ? 'ขอชุดตรวจฟรี' : 'Get a free self-test kit'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/booking')} className="w-full" size="lg">
              <Calendar className="h-5 w-5 mr-2" />
              {isTh ? 'จองตรวจที่คลินิก' : 'Book a clinic test'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 animate-scale-in">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {isTh
              ? 'มีคนที่ห่วงใยสุขภาพของคุณชวนมาตรวจ'
              : 'Someone who cares about your health invited you to test'}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {isTh
              ? 'การตรวจเป็นเรื่องปกติและช่วยให้สบายใจ ตรวจได้แบบส่วนตัว และเลือกวิธีที่สะดวกได้'
              : 'Testing is a normal part of self-care. You can test privately and choose what works for you.'}
          </p>
        </div>

        {/* Privacy badge */}
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            {isTh ? 'เป็นส่วนตัวและปลอดภัย ไม่มีการเปิดเผยตัวตน' : 'Private and safe. No identities revealed.'}
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            onClick={() => { recordEvent('cta_kit'); navigate('/hiv-selftest'); }}
            className="w-full h-14 text-base gap-3"
            size="lg"
          >
            <TestTube className="h-5 w-5" />
            {isTh ? 'ขอชุดตรวจฟรี' : 'Get a free self-test kit'}
          </Button>

          <Button
            variant="outline"
            onClick={() => { recordEvent('cta_booking'); navigate('/booking'); }}
            className="w-full h-14 text-base gap-3"
            size="lg"
          >
            <Calendar className="h-5 w-5" />
            {isTh ? 'จองตรวจที่คลินิก' : 'Book a clinic test'}
          </Button>

          {invite?.invite_type === 'session' && sessionCode && (
            <Button
              variant="secondary"
              onClick={() => { recordEvent('join_session'); navigate(`/invite/session/${sessionCode}`); }}
              className="w-full h-14 text-base gap-3"
              size="lg"
            >
              <Users className="h-5 w-5" />
              {isTh ? 'ตรวจพร้อมกัน' : 'Test together'}
            </Button>
          )}
        </div>

        {/* Reassurance */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          {isTh
            ? 'testD — เพื่อนคู่ใจด้านสุขภาพทางเพศ ฟรี ปลอดภัย ไม่ตัดสิน'
            : 'testD — Your sexual health companion. Free, safe, non-judgmental.'}
        </p>
      </div>
    </div>
  );
}
