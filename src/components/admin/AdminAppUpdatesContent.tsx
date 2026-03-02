import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { APP_VERSION, BUILD_TIME } from '@/config/appVersion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, RefreshCw, Clock, Shield, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReleaseControl {
  id: string;
  latest_version: string;
  build_time: string | null;
  hard_update_min_version: string | null;
  is_hard_update: boolean;
  message_th: string | null;
  message_en: string | null;
  updated_at: string;
  updated_by: string | null;
}

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  action: string;
  old_values: any;
  new_values: any;
}

export default function AdminAppUpdatesContent() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [control, setControl] = useState<ReleaseControl | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Form state
  const [latestVersion, setLatestVersion] = useState('');
  const [isHardUpdate, setIsHardUpdate] = useState(false);
  const [hardMinVersion, setHardMinVersion] = useState('');
  const [messageTh, setMessageTh] = useState('');
  const [messageEn, setMessageEn] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: ctrl }, { data: logs }] = await Promise.all([
      supabase
        .from('app_release_controls')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('release_control_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (ctrl) {
      setControl(ctrl as ReleaseControl);
      setLatestVersion(ctrl.latest_version);
      setIsHardUpdate(ctrl.is_hard_update);
      setHardMinVersion(ctrl.hard_update_min_version || '');
      setMessageTh(ctrl.message_th || '');
      setMessageEn(ctrl.message_en || '');
    }
    setAuditLogs((logs || []) as AuditLog[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const oldValues = control ? {
        latest_version: control.latest_version,
        is_hard_update: control.is_hard_update,
        message_th: control.message_th,
        message_en: control.message_en,
      } : null;

      const newValues = {
        latest_version: latestVersion,
        is_hard_update: isHardUpdate,
        hard_update_min_version: hardMinVersion || null,
        message_th: messageTh,
        message_en: messageEn,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (control?.id) {
        const { error } = await supabase
          .from('app_release_controls')
          .update(newValues)
          .eq('id', control.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_release_controls')
          .insert(newValues);
        if (error) throw error;
      }

      // Audit log
      await supabase.from('release_control_audit_logs').insert({
        user_id: user.id,
        action: 'update_release_config',
        old_values: oldValues,
        new_values: newValues,
      });

      toast.success(language === 'th' ? 'บันทึกสำเร็จ' : 'Saved successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {language === 'th' ? 'ควบคุมการอัปเดตแอป' : 'App Update Control'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'th' ? 'กำหนดเวอร์ชันล่าสุดและระดับความบังคับ' : 'Set latest version and enforcement level'}
          </p>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'เวอร์ชันปัจจุบัน (Client)' : 'Current Version (Client)'}
                </p>
                <p className="font-mono font-bold text-foreground">{APP_VERSION}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'เวอร์ชันล่าสุด (Server)' : 'Latest Version (Server)'}
                </p>
                <p className="font-mono font-bold text-foreground">{control?.latest_version || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'โหมดอัปเดต' : 'Update Mode'}
                </p>
                <Badge variant={control?.is_hard_update ? 'destructive' : 'secondary'}>
                  {control?.is_hard_update
                    ? (language === 'th' ? 'บังคับ (Hard)' : 'Forced (Hard)')
                    : (language === 'th' ? 'แนะนำ (Soft)' : 'Suggested (Soft)')
                  }
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {language === 'th' ? 'ตั้งค่าการอัปเดต' : 'Update Configuration'}
          </CardTitle>
          <CardDescription>
            {language === 'th'
              ? 'เปลี่ยนค่าเหล่านี้แล้วกด "เผยแพร่" เพื่อให้ผู้ใช้ทุกคนเห็นทันที'
              : 'Change these values and click "Publish" to notify all users immediately'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'th' ? 'เวอร์ชันล่าสุด' : 'Latest Version'}</Label>
              <Input
                value={latestVersion}
                onChange={(e) => setLatestVersion(e.target.value)}
                placeholder="e.g. 2026-03-02-v2"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'th' ? 'เวอร์ชันขั้นต่ำ (Hard update)' : 'Min Version (Hard update)'}</Label>
              <Input
                value={hardMinVersion}
                onChange={(e) => setHardMinVersion(e.target.value)}
                placeholder="e.g. 2026-02-01-v1"
                className="font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-foreground">
                {language === 'th' ? 'บังคับอัปเดต (Hard Update)' : 'Force Update (Hard Update)'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'th'
                  ? 'ผู้ใช้จะต้องอัปเดตก่อนใช้งานต่อ'
                  : 'Users must update before continuing to use the app'}
              </p>
            </div>
            <Switch
              checked={isHardUpdate}
              onCheckedChange={setIsHardUpdate}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'th' ? 'ข้อความประกาศ (ไทย)' : 'Announcement (Thai)'}</Label>
            <Textarea
              value={messageTh}
              onChange={(e) => setMessageTh(e.target.value)}
              placeholder="มีเวอร์ชันใหม่พร้อมใช้งาน"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'th' ? 'ข้อความประกาศ (English)' : 'Announcement (English)'}</Label>
            <Textarea
              value={messageEn}
              onChange={(e) => setMessageEn(e.target.value)}
              placeholder="A new version is available"
              rows={2}
            />
          </div>

          <Button onClick={handleSave} disabled={saving || !latestVersion.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {language === 'th' ? 'เผยแพร่การอัปเดต' : 'Publish Update Notice'}
          </Button>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {language === 'th' ? 'ประวัติการเปลี่ยนแปลง' : 'Change History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === 'th' ? 'ยังไม่มีประวัติ' : 'No history yet'}
            </p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {log.action === 'update_release_config'
                        ? (language === 'th' ? 'อัปเดตการตั้งค่า' : 'Updated config')
                        : log.action
                      }
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                    </p>
                    {log.new_values && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">v{log.new_values.latest_version}</span>
                        {' • '}
                        {log.new_values.is_hard_update
                          ? <Badge variant="destructive" className="text-[10px] h-4">Hard</Badge>
                          : <Badge variant="secondary" className="text-[10px] h-4">Soft</Badge>
                        }
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
