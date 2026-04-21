import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, ShieldCheck, Navigation, AlertTriangle, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import { useBranchGeofence } from '@/hooks/useBranchGeofence';
import { selfCheckinRPC } from '@/lib/appointments';
import { supabase } from '@/integrations/supabase/client';

interface GeofenceCheckinBannerProps {
  appointmentId: string;
  branchId: string;
  branchNameTh?: string | null;
  branchNameEn?: string | null;
  referralCode: string | null;
  /** Eligible per existing time-window rules. */
  canCheckin: boolean;
  /** Called after a successful check-in (or undo) so the parent can update local state. Passes the new status. */
  onCheckedIn: (newStatus: 'arrived' | 'booked') => void;
  userId?: string | null;
}

const UNDO_MS = 6000;

/**
 * Geofence-based auto check-in banner.
 *
 * Behavior:
 *  - Asks for location permission (one-shot).
 *  - If user is within 500m of branch → auto check-in with a 6s undo toast.
 *  - If denied / unavailable / outside → falls back to QR code with the
 *    referral code so staff can scan / type it manually.
 */
export function GeofenceCheckinBanner({
  appointmentId,
  branchId,
  branchNameTh,
  branchNameEn,
  referralCode,
  canCheckin,
  onCheckedIn,
  userId,
}: GeofenceCheckinBannerProps) {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const branchName = isTh ? branchNameTh : branchNameEn;

  const { status, distance, radiusM, retry } = useBranchGeofence({
    branchId,
    enabled: canCheckin,
  });

  const [autoCheckedIn, setAutoCheckedIn] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const triggeredRef = useRef(false);
  const undoneRef = useRef(false);

  // Auto check-in on geofence match
  useEffect(() => {
    if (status !== 'inside' || triggeredRef.current || !canCheckin) return;
    triggeredRef.current = true;

    (async () => {
      try {
        await selfCheckinRPC(appointmentId);
        if (undoneRef.current) return; // user undid before RPC settled
        setAutoCheckedIn(true);
        onCheckedIn('arrived');

        // Award XP (mirrors manual check-in path)
        if (userId) {
          supabase.rpc('award_xp_to_user', { target_user_id: userId, xp_amount: 500 }).then(() => {});
        }

        // Show undo toast
        setUndoing(true);
        toast.success(
          isTh ? 'เช็คอินอัตโนมัติแล้ว ✅' : 'Auto checked-in ✅',
          {
            description: isTh
              ? `อยู่ในรัศมี ${branchName} • กดยกเลิกได้ภายใน ${UNDO_MS / 1000} วินาที`
              : `You're at ${branchName} • tap undo within ${UNDO_MS / 1000}s`,
            duration: UNDO_MS,
            action: {
              label: isTh ? 'ยกเลิก' : 'Undo',
              onClick: async () => {
                undoneRef.current = true;
                try {
                  // Revert by setting status back to booked
                  await supabase.rpc('update_appointment_status', {
                    p_appointment_id: appointmentId,
                    p_new_status: 'booked',
                    p_reason: 'Undo auto check-in',
                  });
                  setAutoCheckedIn(false);
                  triggeredRef.current = false;
                  toast.info(isTh ? 'ยกเลิกการเช็คอินแล้ว' : 'Check-in undone');
                  onCheckedIn('booked'); // refresh
                } catch {
                  toast.error(isTh ? 'ยกเลิกไม่สำเร็จ' : 'Could not undo');
                }
              },
            },
          },
        );
        setTimeout(() => setUndoing(false), UNDO_MS);
      } catch (err: any) {
        triggeredRef.current = false;
        const msg = err?.message || '';
        if (msg.includes('Too early')) {
          toast.error(isTh ? 'ยังเร็วเกินไปสำหรับเช็คอิน' : 'Too early to check in');
        } else if (msg.includes('expired')) {
          toast.error(isTh ? 'หมดเวลาเช็คอินแล้ว' : 'Check-in window expired');
        } else {
          toast.error(isTh ? 'เช็คอินอัตโนมัติไม่สำเร็จ' : 'Auto check-in failed');
        }
      }
    })();
  }, [status, canCheckin, appointmentId, isTh, branchName, onCheckedIn, userId]);

  if (!canCheckin && !autoCheckedIn) return null;
  if (autoCheckedIn && !undoing) return null;

  // === States ===
  if (status === 'requesting' || status === 'idle') {
    return (
      <Card className="p-4 bg-primary/5 border-primary/30 flex items-start gap-3">
        <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {isTh ? 'กำลังตรวจสอบตำแหน่งเพื่อเช็คอินอัตโนมัติ' : 'Checking your location for auto check-in'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            {isTh
              ? 'ใช้เพียงระยะห่างจากคลินิก ไม่บันทึกพิกัดของคุณ'
              : 'Only distance to clinic is used. Your coordinates are never stored.'}
          </p>
        </div>
      </Card>
    );
  }

  if (status === 'inside' && undoing) {
    return (
      <Card className="p-4 bg-success/10 border-success/40 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isTh ? 'เช็คอินอัตโนมัติเรียบร้อย' : 'Auto checked-in'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isTh
              ? `อยู่ในรัศมี ${radiusM} ม. จาก ${branchName} • กดยกเลิกได้จากแถบแจ้งเตือน`
              : `Within ${radiusM}m of ${branchName} • undo via the toast notification`}
          </p>
        </div>
      </Card>
    );
  }

  if (status === 'outside') {
    return (
      <Card className="p-4 bg-muted/40 border-border flex items-start gap-3">
        <Navigation className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isTh ? 'ยังไม่ถึงคลินิก' : 'Not at the clinic yet'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isTh
              ? `คุณห่างจาก ${branchName} ประมาณ ${formatDistance(distance)} • ระบบจะเช็คอินให้อัตโนมัติเมื่อเข้าใกล้รัศมี ${radiusM} ม.`
              : `About ${formatDistance(distance)} from ${branchName} • we'll auto check-in within ${radiusM}m`}
          </p>
          <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs" onClick={retry}>
            <MapPin className="h-3 w-3 mr-1" />
            {isTh ? 'ตรวจตำแหน่งอีกครั้ง' : 'Re-check location'}
          </Button>
        </div>
      </Card>
    );
  }

  // Denied / unavailable / error → fall back to QR
  if (status === 'denied' || status === 'unavailable' || status === 'error') {
    return (
      <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {status === 'denied'
                ? (isTh ? 'ไม่ได้รับอนุญาตเข้าถึงตำแหน่ง' : 'Location permission denied')
                : (isTh ? 'ไม่สามารถระบุตำแหน่งได้' : 'Location unavailable')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isTh
                ? 'ใช้รหัสด้านล่างแสดงให้เจ้าหน้าที่ที่จุดลงทะเบียนแทนได้'
                : 'Show the code below to staff at reception instead.'}
            </p>
          </div>
        </div>

        {referralCode && (
          <div className="flex flex-col items-center gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
            <button
              type="button"
              onClick={() => setShowQR((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
            >
              <QrCode className="h-3.5 w-3.5" />
              {showQR
                ? (isTh ? 'ซ่อน QR' : 'Hide QR code')
                : (isTh ? 'แสดง QR สำหรับเช็คอิน' : 'Show check-in QR')}
            </button>
            {showQR && (
              <img
                alt={isTh ? `QR สำหรับรหัส ${referralCode}` : `QR code for ${referralCode}`}
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(referralCode)}`}
                width={180}
                height={180}
                className="rounded-md bg-white p-2"
              />
            )}
            <p className="font-mono font-bold tracking-widest text-base text-foreground">
              {referralCode}
            </p>
          </div>
        )}
      </Card>
    );
  }

  return null;
}

function formatDistance(d: number | null): string {
  if (d == null) return '—';
  if (d < 1000) return `${d} m`;
  return `${(d / 1000).toFixed(1)} km`;
}
