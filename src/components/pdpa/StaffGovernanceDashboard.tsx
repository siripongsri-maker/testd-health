import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Clock, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Shield, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { format } from 'date-fns';

interface StaffSession {
  id: string;
  user_id: string;
  role: string;
  branch: string | null;
  login_at: string;
  last_active_at: string;
  logout_at: string | null;
  is_active: boolean;
  force_logout: boolean;
  device_info: string | null;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  description: string;
  details: any;
  actor_role: string | null;
  branch: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export function StaffGovernanceDashboard() {
  const { language } = useLanguage();
  const th = language === 'th';
  const [sessions, setSessions] = useState<StaffSession[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [sessRes, alertsRes] = await Promise.all([
      supabase.from('staff_access_sessions').select('*').order('login_at', { ascending: false }).limit(100) as any,
      supabase.from('security_alerts').select('*').order('created_at', { ascending: false }).limit(50) as any,
    ]);
    if (sessRes.data) setSessions(sessRes.data);
    if (alertsRes.data) setAlerts(alertsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const activeSessions = sessions.filter(s => s.is_active);
  const unresolvedAlerts = alerts.filter(a => !a.is_resolved);

  const handleForceLogout = async (sessionId: string) => {
    await supabase.from('staff_access_sessions').update({
      force_logout: true,
      force_logout_reason: 'Admin forced logout',
    } as any).eq('id', sessionId);
    fetchData();
  };

  const handleResolveAlert = async (alertId: string) => {
    await supabase.from('security_alerts').update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_notes: 'Reviewed and resolved by admin',
    } as any).eq('id', alertId);
    fetchData();
  };

  const SEVERITY_COLORS: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-warning/10 text-warning',
    high: 'bg-destructive/10 text-destructive',
    critical: 'bg-destructive text-destructive-foreground',
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold">{activeSessions.length}</p>
          <p className="text-xs text-muted-foreground">{th ? 'เซสชันที่ใช้งาน' : 'Active Sessions'}</p>
        </Card>
        <Card className="p-3 text-center">
          <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xl font-bold">{sessions.length}</p>
          <p className="text-xs text-muted-foreground">{th ? 'เซสชันทั้งหมด' : 'Total Sessions'}</p>
        </Card>
        <Card className="p-3 text-center">
          <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${unresolvedAlerts.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          <p className="text-xl font-bold">{unresolvedAlerts.length}</p>
          <p className="text-xs text-muted-foreground">{th ? 'แจ้งเตือนที่ยังไม่แก้ไข' : 'Unresolved Alerts'}</p>
        </Card>
        <Card className="p-3 text-center">
          <Shield className="h-5 w-5 mx-auto mb-1 text-success" />
          <p className="text-xl font-bold">{alerts.filter(a => a.is_resolved).length}</p>
          <p className="text-xs text-muted-foreground">{th ? 'แก้ไขแล้ว' : 'Resolved'}</p>
        </Card>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">{th ? 'เซสชันเจ้าหน้าที่' : 'Staff Sessions'}</TabsTrigger>
          <TabsTrigger value="alerts">
            {th ? 'การแจ้งเตือนความปลอดภัย' : 'Security Alerts'}
            {unresolvedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">{unresolvedAlerts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {sessions.map(session => (
                <Card key={session.id} className="p-3">
                  <div className="flex items-center gap-3">
                    {session.is_active
                      ? <Wifi className="h-4 w-4 text-success shrink-0" />
                      : <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{session.role}</Badge>
                        {session.branch && <span className="text-xs text-muted-foreground">{session.branch}</span>}
                        {session.force_logout && <Badge variant="destructive" className="text-[10px]">{th ? 'บังคับออก' : 'Forced out'}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {th ? 'เข้า: ' : 'In: '}{format(new Date(session.login_at), 'dd/MM HH:mm')}
                        {' • '}
                        {th ? 'ล่าสุด: ' : 'Last: '}{format(new Date(session.last_active_at), 'HH:mm')}
                        {session.logout_at && ` • ${th ? 'ออก: ' : 'Out: '}${format(new Date(session.logout_at), 'HH:mm')}`}
                      </p>
                    </div>
                    {session.is_active && !session.force_logout && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 text-xs"
                        onClick={() => handleForceLogout(session.id)}
                      >
                        {th ? 'บังคับออก' : 'Force Logout'}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              {sessions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">{th ? 'ไม่มีข้อมูล' : 'No sessions'}</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="alerts">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {alerts.map(alert => (
                <Card key={alert.id} className={`p-3 ${!alert.is_resolved ? 'border-destructive/20' : ''}`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${alert.is_resolved ? 'text-muted-foreground' : 'text-destructive'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{alert.alert_type}</span>
                        <Badge className={`text-[10px] ${SEVERITY_COLORS[alert.severity] || ''}`}>{alert.severity}</Badge>
                        {alert.is_resolved && <Badge variant="outline" className="text-[10px] text-success">{th ? 'แก้ไขแล้ว' : 'Resolved'}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    {!alert.is_resolved && (
                      <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={() => handleResolveAlert(alert.id)}>
                        {th ? 'แก้ไข' : 'Resolve'}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              {alerts.length === 0 && (
                <Card className="p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="text-sm text-muted-foreground">{th ? 'ไม่มีการแจ้งเตือน' : 'No alerts'}</p>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
