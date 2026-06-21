import { useEffect } from "react";
import { useParams } from "react-router-dom";

/**
 * Public redirector for SMS tracking links.
 * URL shape: /r/:token
 * Immediately forwards to the Supabase edge function `sms-redirect`,
 * which records the click and 302-redirects to the original URL.
 */
export default function SmsRedirect() {
  const { token } = useParams<{ token: string }>();

  useEffect(() => {
    const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const safe = (token || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
    if (!base || !safe) {
      window.location.replace("/");
      return;
    }
    window.location.replace(`${base.replace(/\/+$/, "")}/functions/v1/sms-redirect?t=${encodeURIComponent(safe)}`);
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      กำลังเปิดลิงก์... / Opening link…
    </div>
  );
}
