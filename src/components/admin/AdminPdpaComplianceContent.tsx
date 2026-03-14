import { useState, useEffect, lazy, Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Activity, FileDown, Eye, AlertTriangle, Search, RefreshCw, CheckCircle2, XCircle, Clock, Lock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { format } from 'date-fns';
import { PermissionMatrixView } from '@/components/pdpa/PermissionMatrixView';
import { StaffGovernanceDashboard } from '@/components/pdpa/StaffGovernanceDashboard';

interface AuditLog {
  id: string;
  actor_type: string;
  actor_id: string | null;
  actor_role: string | null;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  target_classification: string | null;
  reason: string | null;
  branch: string | null;
  result: string;
  created_at: string;
  metadata: any;
}

interface ConsentStat {
  consent_type: string;
  total: number;
  granted: number;
  withdrawn: number;
}

const ACTION_ICONS: Record<string, typeof Activity> = {
  reveal_masked_field: Eye,
  export_attempt: FileDown,
  export_success: FileDown,
  failed_access: AlertTriangle,
  suspicious_bulk_access: AlertTriangle,
};

const RESULT_COLORS: Record<string, string> = {
  allowed: 'text-success',
  denied: 'text-destructive',
  failed: 'text-warning',
};

export default function AdminPdpaComplianceContent() {
  const { language } = useLanguage();
  const th = language === 'th';
  const [activeTab, setActiveTab] = useState('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [consentStats, setConsentStats] = useState<ConsentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    const [logsRes, consentsRes] = await Promise.all([
      supabase
        .from('pdpa_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200) as any,
      supabase
        .from('consent_records')
        .select('consent_type, granted, action') as any,
    ]);

    if (logsRes.data) setAuditLogs(logsRes.data);

    // Aggregate consent stats
    if (consentsRes.data) {
      const map = new Map<string, ConsentStat>();
      for (const r of consentsRes.data) {
        const stat = map.get(r.consent_type) || { consent_type: r.consent_type, total: 0, granted: 0, withdrawn: 0 };
        stat.total++;
        if (r.granted) stat.granted++;
        if (r.action === 'withdrawn') stat.withdrawn++;
        map.set(r.consent_type, stat);
      }
      setConsentStats(Array.from(map.values()));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredLogs = auditLogs.filter(log => {
    if (actionFilter !== 'all' && log.action_type !== actionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.action_type.toLowerCase().includes(q) ||
        (log.target_type?.toLowerCase().includes(q)) ||
        (log.actor_role?.toLowerCase().includes(q)) ||
        (log.reason?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const highRiskCount = auditLogs.filter(l => l.result === 'denied' || l.result === 'failed' || l.action_type.includes('suspicious')).length;
  const exportCount = auditLogs.filter(l => l.action_type.includes('export')).length;
  const revealCount = auditLogs.filter(l => l.action_type === 'reveal_masked_field').length;

  const actionTypes = [...new Set(auditLogs.map(l => l.action_type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {th ? 'ศูนย์ปฏิบัติตาม PDPA' : 'PDPA Compliance Center'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {th ? 'ความยินยอม ตรวจสอบ ความปลอดภัย' : 'Consent, Audit, Security'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {th ? 'รีเฟรช' : 'Refresh'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{th ? 'ภาพรวม' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="consent">{th ? 'ความยินยอม' : 'Consent'}</TabsTrigger>
          <TabsTrigger value="audit">{th ? 'บันทึกตรวจสอบ' : 'Audit Logs'}</TabsTrigger>
          <TabsTrigger value="alerts">{th ? 'การแจ้งเตือน' : 'Alerts'}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold">{consentStats.reduce((s, c) => s + c.granted, 0)}</p>
              <p className="text-xs text-muted-foreground">{th ? 'ความยินยอมที่ให้แล้ว' : 'Active Consents'}</p>
            </Card>
            <Card className="p-4 text-center">
              <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{auditLogs.length}</p>
              <p className="text-xs text-muted-foreground">{th ? 'บันทึกตรวจสอบ' : 'Audit Events'}</p>
            </Card>
            <Card className="p-4 text-center">
              <FileDown className="h-6 w-6 mx-auto mb-2 text-accent-foreground" />
              <p className="text-2xl font-bold">{exportCount}</p>
              <p className="text-xs text-muted-foreground">{th ? 'การส่งออก' : 'Exports'}</p>
            </Card>
            <Card className="p-4 text-center">
              <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${highRiskCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <p className="text-2xl font-bold">{highRiskCount}</p>
              <p className="text-xs text-muted-foreground">{th ? 'เหตุการณ์ความเสี่ยง' : 'Risk Events'}</p>
            </Card>
          </div>

          {/* Quick stats */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">{th ? 'กิจกรรมล่าสุด' : 'Recent Activity'}</h3>
            <div className="space-y-2">
              {auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <Badge variant="outline" className="text-xs shrink-0">{log.action_type}</Badge>
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    {log.target_type || '—'} {log.target_id ? `#${log.target_id.slice(0, 8)}` : ''}
                  </span>
                  <span className={`text-xs ${RESULT_COLORS[log.result] || ''}`}>{log.result}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(log.created_at), 'HH:mm')}
                  </span>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {th ? 'ยังไม่มีบันทึก' : 'No audit logs yet'}
                </p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Consent Tab */}
        <TabsContent value="consent" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {consentStats.map(stat => (
              <Card key={stat.consent_type} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{stat.consent_type}</h4>
                  <Badge variant={stat.withdrawn > 0 ? 'destructive' : 'default'}>
                    {stat.granted}/{stat.total}
                  </Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" /> {stat.granted} {th ? 'ยินยอม' : 'granted'}
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-destructive" /> {stat.withdrawn} {th ? 'ถอน' : 'withdrawn'}
                  </span>
                </div>
                {/* Consent rate bar */}
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${stat.total > 0 ? (stat.granted / stat.total) * 100 : 0}%` }}
                  />
                </div>
              </Card>
            ))}
            {consentStats.length === 0 && (
              <Card className="p-8 text-center col-span-2">
                <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {th ? 'ยังไม่มีข้อมูลความยินยอม' : 'No consent data yet'}
                </p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={th ? 'ค้นหาบันทึก...' : 'Search logs...'}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{th ? 'ทุกประเภท' : 'All Actions'}</SelectItem>
                {actionTypes.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-1">
              {filteredLogs.map(log => {
                const Icon = ACTION_ICONS[log.action_type] || Activity;
                return (
                  <div key={log.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 border-b border-border/50">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{log.action_type}</span>
                        {log.target_classification && (
                          <Badge variant={log.target_classification === 'highly_restricted' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {log.target_classification}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {log.actor_role || log.actor_type} → {log.target_type || '—'}
                        {log.reason ? ` | ${log.reason}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${RESULT_COLORS[log.result] || ''}`}>{log.result}</span>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd/MM HH:mm')}
                    </span>
                  </div>
                );
              })}
              {filteredLogs.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {th ? 'ไม่พบบันทึก' : 'No logs found'}
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {highRiskCount > 0 ? (
            <div className="space-y-2">
              {auditLogs
                .filter(l => l.result === 'denied' || l.result === 'failed' || l.action_type.includes('suspicious'))
                .slice(0, 20)
                .map(log => (
                  <Card key={log.id} className="p-3 border-destructive/20 bg-destructive/5">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{log.action_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.actor_role} — {log.target_type || '—'} — {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">{log.result}</Badge>
                    </div>
                  </Card>
                ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-sm font-medium text-foreground">
                {th ? 'ไม่มีการแจ้งเตือนที่ต้องตรวจสอบ' : 'No alerts to review'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {th ? 'ระบบไม่พบกิจกรรมที่น่าสงสัย' : 'No suspicious activity detected'}
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
