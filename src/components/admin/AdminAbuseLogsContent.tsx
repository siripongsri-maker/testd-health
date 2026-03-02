import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Download, ShieldAlert, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface RateLog {
  id: string;
  created_at: string;
  actor_type: string;
  user_id: string | null;
  session_id: string | null;
  contact_phone_hash: string | null;
  branch_id: string | null;
  action: string;
  reason_code: string | null;
  meta: any;
}

interface Branch {
  id: string;
  name_th: string;
  name_en: string;
}

const PAGE_SIZE = 25;

export default function AdminAbuseLogsContent() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [logs, setLogs] = useState<RateLog[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Detail drawer
  const [selectedLog, setSelectedLog] = useState<RateLog | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [branchRes, staffRes] = await Promise.all([
        supabase.from('booking_branches').select('id, name_th, name_en').eq('is_active', true),
        user ? supabase.from('staff_profiles').select('staff_role').eq('user_id', user.id).eq('is_active', true).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setBranches((branchRes.data || []) as Branch[]);
      if (staffRes.data && (staffRes.data as any).staff_role === 'super_admin') {
        setIsSuperAdmin(true);
      }
    };
    init();
  }, [user]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('booking_rate_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterBranch !== 'all') query = query.eq('branch_id', filterBranch);
    if (filterAction !== 'all') query = query.eq('action', filterAction);
    if (filterReason !== 'all') query = query.eq('reason_code', filterReason);
    if (filterDateFrom) query = query.gte('created_at', filterDateFrom + 'T00:00:00');
    if (filterDateTo) query = query.lte('created_at', filterDateTo + 'T23:59:59');

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching abuse logs:', error);
    }
    const rows = (data || []) as unknown as RateLog[];
    setLogs(rows);
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  }, [page, filterBranch, filterAction, filterReason, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const exportCSV = async () => {
    let query = supabase
      .from('booking_rate_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (filterBranch !== 'all') query = query.eq('branch_id', filterBranch);
    if (filterAction !== 'all') query = query.eq('action', filterAction);
    if (filterReason !== 'all') query = query.eq('reason_code', filterReason);
    if (filterDateFrom) query = query.gte('created_at', filterDateFrom + 'T00:00:00');
    if (filterDateTo) query = query.lte('created_at', filterDateTo + 'T23:59:59');

    const { data } = await query;
    if (!data || data.length === 0) {
      toast.error(language === 'th' ? 'ไม่มีข้อมูล' : 'No data to export');
      return;
    }

    // Log export
    if (user) {
      await supabase.from('export_audit_logs').insert({
        user_id: user.id,
        export_type: 'booking_rate_logs',
        row_count: data.length,
        is_full_export: isSuperAdmin,
        filters: { filterBranch, filterAction, filterReason, filterDateFrom, filterDateTo },
      });
    }

    const headers = ['created_at', 'actor_type', 'action', 'reason_code', 'branch_id', 'contact_phone_hash', 'user_id'];
    const rows = data.map((r: any) => headers.map(h => {
      if (h === 'contact_phone_hash' && !isSuperAdmin) return (r[h] || '').slice(0, 8) + '…';
      if (h === 'user_id' && !isSuperAdmin) return r[h] ? r[h].slice(0, 8) + '…' : '';
      return r[h] ?? '';
    }));

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abuse-logs-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(language === 'th' ? 'Export สำเร็จ' : 'Exported successfully');
  };

  const branchName = (id: string | null) => {
    if (!id) return '—';
    const b = branches.find(br => br.id === id);
    return b ? (language === 'th' ? b.name_th : b.name_en) : id.slice(0, 8);
  };

  const reasonLabel = (code: string | null) => {
    const map: Record<string, { th: string; en: string }> = {
      rate_limited_phone: { th: 'เบอร์โทรจองถี่เกิน', en: 'Phone rate limited' },
      rate_limited_user: { th: 'ผู้ใช้จองถี่เกิน', en: 'User rate limited' },
      duplicate_active: { th: 'มีนัดหมายซ้ำ', en: 'Duplicate active booking' },
      staff_bypass: { th: 'Staff bypass', en: 'Staff bypass' },
      passed: { th: 'ผ่าน', en: 'Passed' },
    };
    const info = map[code || ''];
    return info ? (language === 'th' ? info.th : info.en) : (code || '—');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          {language === 'th' ? 'Anti-spam / Abuse Logs' : 'Anti-spam / Abuse Logs'}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {language === 'th' ? 'รีเฟรช' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterBranch} onValueChange={v => { setFilterBranch(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder={language === 'th' ? 'สาขา' : 'Branch'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'th' ? 'ทุกสาขา' : 'All branches'}</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{language === 'th' ? b.name_th : b.name_en}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={v => { setFilterAction(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'th' ? 'ทุกสถานะ' : 'All'}</SelectItem>
              <SelectItem value="blocked">{language === 'th' ? 'ถูกบล็อก' : 'Blocked'}</SelectItem>
              <SelectItem value="allow">{language === 'th' ? 'อนุญาต' : 'Allowed'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterReason} onValueChange={v => { setFilterReason(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'th' ? 'ทุกเหตุผล' : 'All reasons'}</SelectItem>
              <SelectItem value="rate_limited_phone">{language === 'th' ? 'เบอร์ถี่เกิน' : 'Phone rate'}</SelectItem>
              <SelectItem value="rate_limited_user">{language === 'th' ? 'ผู้ใช้ถี่เกิน' : 'User rate'}</SelectItem>
              <SelectItem value="duplicate_active">{language === 'th' ? 'ซ้ำ' : 'Duplicate'}</SelectItem>
              <SelectItem value="staff_bypass">Staff bypass</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" className="w-[130px] h-8 text-xs" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(0); }} />
          <span className="text-xs text-muted-foreground">—</span>
          <Input type="date" className="w-[130px] h-8 text-xs" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(0); }} />
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : logs.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">{language === 'th' ? 'ไม่มีข้อมูล' : 'No logs found'}</p>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <Card
              key={log.id}
              className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedLog(log)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Badge variant={log.action === 'blocked' ? 'destructive' : 'secondary'}>
                    {log.action === 'blocked' ? (language === 'th' ? 'บล็อก' : 'Blocked') : (language === 'th' ? 'อนุญาต' : 'Allow')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{reasonLabel(log.reason_code)}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs font-mono">{log.actor_type}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{branchName(log.branch_id)}</span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_at), 'dd/MM HH:mm')}</span>
                </div>
              </div>
              {log.contact_phone_hash && (
                <div className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
                  📱 {isSuperAdmin ? log.contact_phone_hash : log.contact_phone_hash.slice(0, 12) + '…'}
                </div>
              )}
            </Card>
          ))}

          {/* Pagination */}
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground py-1">{page + 1}</span>
            <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{language === 'th' ? 'รายละเอียด Log' : 'Log Detail'}</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">{language === 'th' ? 'สถานะ' : 'Action'}</div>
                  <Badge variant={selectedLog.action === 'blocked' ? 'destructive' : 'secondary'}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">{language === 'th' ? 'เหตุผล' : 'Reason'}</div>
                  <div className="font-medium">{reasonLabel(selectedLog.reason_code)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">{language === 'th' ? 'ประเภท' : 'Actor'}</div>
                  <div>{selectedLog.actor_type}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">{language === 'th' ? 'เวลา' : 'Time'}</div>
                  <div>{format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">{language === 'th' ? 'สาขา' : 'Branch'}</div>
                  <div>{branchName(selectedLog.branch_id)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">User ID</div>
                  <div className="font-mono text-xs truncate">
                    {selectedLog.user_id ? (isSuperAdmin ? selectedLog.user_id : selectedLog.user_id.slice(0, 8) + '…') : '—'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs">{language === 'th' ? 'เบอร์โทร (hash)' : 'Phone hash'}</div>
                  <div className="font-mono text-xs break-all">
                    {selectedLog.contact_phone_hash ? (isSuperAdmin ? selectedLog.contact_phone_hash : selectedLog.contact_phone_hash.slice(0, 16) + '…') : '—'}
                  </div>
                </div>
              </div>
              {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Meta</div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(selectedLog.meta, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
