import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/PageLoader";
import UnifiedOutreachForm from "@/components/admin/mel/UnifiedOutreachForm";

export default function OutreachForm() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    const check = async () => {
      // Allow outreach_staff, admin, moderator, me_analyst
      const roles: Array<"outreach_staff" | "admin" | "moderator" | "me_analyst"> = [
        "outreach_staff",
        "admin",
        "moderator",
        "me_analyst",
      ];
      for (const role of roles) {
        const { data } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: role,
        } as any);
        if (data) {
          setAuthorized(true);
          return;
        }
      }
      setAuthorized(false);
    };
    check();
  }, [user, authLoading, navigate]);

  if (authLoading || authorized === null) return <PageLoader />;

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-4">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">ไม่มีสิทธิ์เข้าถึง</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          คุณไม่มีสิทธิ์เข้าถึงแบบฟอร์มนี้ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ outreach_staff
        </p>
        <button
          onClick={() => navigate("/")}
          className="text-primary underline text-sm mt-2"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header for standalone mode */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground">📋 แบบฟอร์มรวม Outreach</h1>
            <p className="text-xs text-muted-foreground">บันทึกข้อมูลภาคสนาม</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/auth", { replace: true });
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-muted"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
      <div className="px-4 py-4 max-w-2xl mx-auto">
        <UnifiedOutreachForm onClose={() => navigate("/outreach-form")} />
      </div>
    </div>
  );
}
