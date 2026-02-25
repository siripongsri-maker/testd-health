import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock, CalendarOff, Plus, Trash2, Edit2, Loader2, Copy, Globe, Building2, Save,
} from 'lucide-react';
import { format } from 'date-fns';

interface Branch {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
}

interface WorkingHour {
  id: string;
  branch_id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  slot_minutes: number;
}

interface Blackout {
  id: string;
  scope: string;
  title: string;
  reason: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  applies_to_branch_ids: string[] | null;
  created_by: string | null;
  created_at: string;
}

const DAY_NAMES_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminScheduleContent() {
  const { language } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Blackout dialog
  const [showBlackoutDialog, setShowBlackoutDialog] = useState(false);
  const [editingBlackout, setEditingBlackout] = useState<Blackout | null>(null);
  const [blackoutForm, setBlackoutForm] = useState({
    scope: 'global' as 'global' | 'branch',
    title: '',
    reason: '',
    start_at: '',
    end_at: '',
    is_all_day: false,
    branch_ids: [] as string[],
  });

  // Copy dialog
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySource, setCopySource] = useState('');

  // Load branches
  useEffect(() => {
    supabase
      .from('booking_branches')
      .select('id, slug, name_th, name_en')
      .eq('is_active', true)
      .order('name_en')
      .then(({ data }) => {
        if (data) {
          setBranches(data);
          if (data.length > 0) setSelectedBranch(data[0].id);
        }
      });
  }, []);

  // Load working hours for selected branch
  const loadWorkingHours = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    const { data } = await supabase
      .from('branch_working_hours')
      .select('*')
      .eq('branch_id', selectedBranch)
      .order('day_of_week');

    if (data) {
      // Fill in missing days with defaults
      const existing = new Map(data.map(d => [d.day_of_week, d]));
      const full: WorkingHour[] = [];
      for (let d = 0; d < 7; d++) {
        if (existing.has(d)) {
          full.push(existing.get(d)!);
        } else {
          full.push({
            id: '',
            branch_id: selectedBranch,
            day_of_week: d,
            is_open: d >= 1 && d <= 5, // Mon-Fri open by default
            open_time: '10:00:00',
            close_time: '18:00:00',
            slot_minutes: 60,
          });
        }
      }
      setWorkingHours(full);
    }
    setLoading(false);
  }, [selectedBranch]);

  // Load blackouts
  const loadBlackouts = useCallback(async () => {
    const { data } = await supabase
      .from('booking_blackouts')
      .select('*')
      .order('start_at', { ascending: false });
    if (data) setBlackouts(data as Blackout[]);
  }, []);

  useEffect(() => { loadWorkingHours(); }, [loadWorkingHours]);
  useEffect(() => { loadBlackouts(); }, [loadBlackouts]);

  // Update a working hour field
  const updateHour = (dayOfWeek: number, field: keyof WorkingHour, value: any) => {
    setWorkingHours(prev =>
      prev.map(h => h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h)
    );
  };

  // Save working hours
  const saveWorkingHours = async () => {
    setSaving(true);
    try {
      for (const h of workingHours) {
        const row = {
          branch_id: selectedBranch,
          day_of_week: h.day_of_week,
          is_open: h.is_open,
          open_time: h.open_time.length === 5 ? h.open_time + ':00' : h.open_time,
          close_time: h.close_time.length === 5 ? h.close_time + ':00' : h.close_time,
          slot_minutes: h.slot_minutes,
        };

        if (h.id) {
          await supabase.from('branch_working_hours').update(row).eq('id', h.id);
        } else {
          await supabase.from('branch_working_hours').upsert(row, {
            onConflict: 'branch_id,day_of_week',
          });
        }
      }
      toast.success(language === 'th' ? 'บันทึกเวลาทำการแล้ว' : 'Working hours saved');
      loadWorkingHours();
    } catch (err: any) {
      toast.error(err.message || 'Error saving');
    }
    setSaving(false);
  };

  // Copy from another branch
  const copyFromBranch = async () => {
    if (!copySource || copySource === selectedBranch) return;
    const { data } = await supabase
      .from('branch_working_hours')
      .select('*')
      .eq('branch_id', copySource)
      .order('day_of_week');

    if (data && data.length > 0) {
      setWorkingHours(data.map(d => ({
        ...d,
        id: '', // new records
        branch_id: selectedBranch,
      })));
      setShowCopyDialog(false);
      toast.info(language === 'th' ? 'คัดลอกแล้ว กดบันทึกเพื่อยืนยัน' : 'Copied. Click Save to confirm.');
    } else {
      toast.error(language === 'th' ? 'ไม่พบข้อมูลเวลาทำการของสาขานี้' : 'No working hours found for that branch');
    }
  };

  // Blackout CRUD
  const openBlackoutDialog = (blackout?: Blackout) => {
    if (blackout) {
      setEditingBlackout(blackout);
      setBlackoutForm({
        scope: blackout.scope as 'global' | 'branch',
        title: blackout.title,
        reason: blackout.reason || '',
        start_at: blackout.start_at.slice(0, 16),
        end_at: blackout.end_at.slice(0, 16),
        is_all_day: blackout.is_all_day,
        branch_ids: blackout.applies_to_branch_ids || [],
      });
    } else {
      setEditingBlackout(null);
      setBlackoutForm({
        scope: 'global',
        title: '',
        reason: '',
        start_at: '',
        end_at: '',
        is_all_day: false,
        branch_ids: [],
      });
    }
    setShowBlackoutDialog(true);
  };

  const saveBlackout = async () => {
    if (!blackoutForm.title || !blackoutForm.start_at || !blackoutForm.end_at) {
      toast.error(language === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const row = {
        scope: blackoutForm.scope,
        title: blackoutForm.title,
        reason: blackoutForm.reason || null,
        start_at: new Date(blackoutForm.start_at).toISOString(),
        end_at: new Date(blackoutForm.end_at).toISOString(),
        is_all_day: blackoutForm.is_all_day,
        applies_to_branch_ids: blackoutForm.scope === 'branch' ? blackoutForm.branch_ids : null,
      };

      if (editingBlackout) {
        await supabase.from('booking_blackouts').update(row).eq('id', editingBlackout.id);
      } else {
        await supabase.from('booking_blackouts').insert(row);
      }
      toast.success(language === 'th' ? 'บันทึกแล้ว' : 'Saved');
      setShowBlackoutDialog(false);
      loadBlackouts();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const deleteBlackout = async (id: string) => {
    if (!confirm(language === 'th' ? 'ต้องการลบ?' : 'Delete this blackout?')) return;
    await supabase.from('booking_blackouts').delete().eq('id', id);
    toast.success(language === 'th' ? 'ลบแล้ว' : 'Deleted');
    loadBlackouts();
  };

  const toggleBranchId = (branchId: string) => {
    setBlackoutForm(prev => ({
      ...prev,
      branch_ids: prev.branch_ids.includes(branchId)
        ? prev.branch_ids.filter(b => b !== branchId)
        : [...prev.branch_ids, branchId],
    }));
  };

  const getBranchName = (id: string) => {
    const b = branches.find(br => br.id === id);
    return b ? (language === 'th' ? b.name_th : b.name_en) : id;
  };

  const dayNames = language === 'th' ? DAY_NAMES_TH : DAY_NAMES_EN;

  if (loading && branches.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">
        <Clock className="h-5 w-5 inline mr-2" />
        {language === 'th' ? 'เวลาทำการ & ปิดรับนัด' : 'Schedule & Blackout Management'}
      </h2>

      <Tabs defaultValue="hours">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {language === 'th' ? 'เวลาทำการ' : 'Working Hours'}
          </TabsTrigger>
          <TabsTrigger value="blackouts" className="flex items-center gap-2">
            <CalendarOff className="h-4 w-4" />
            {language === 'th' ? 'ปิดรับนัด' : 'Blackouts'}
          </TabsTrigger>
        </TabsList>

        {/* Working Hours Tab */}
        <TabsContent value="hours" className="space-y-4 mt-4">
          {/* Branch selector */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 overflow-x-auto">
              {branches.map(b => (
                <Button
                  key={b.id}
                  variant={selectedBranch === b.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedBranch(b.id)}
                >
                  {language === 'th' ? b.name_th : b.name_en}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowCopyDialog(true)}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              {language === 'th' ? 'คัดลอกจากสาขาอื่น' : 'Copy from branch'}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Card className="divide-y divide-border">
              {workingHours.map(h => (
                <div key={h.day_of_week} className="flex items-center gap-3 p-3 flex-wrap">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-medium">{dayNames[h.day_of_week]}</p>
                  </div>
                  <Switch
                    checked={h.is_open}
                    onCheckedChange={(v) => updateHour(h.day_of_week, 'is_open', v)}
                  />
                  <span className={`text-xs ${h.is_open ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {h.is_open
                      ? (language === 'th' ? 'เปิด' : 'Open')
                      : (language === 'th' ? 'ปิด' : 'Closed')}
                  </span>
                  {h.is_open && (
                    <>
                      <Input
                        type="time"
                        value={h.open_time.slice(0, 5)}
                        onChange={(e) => updateHour(h.day_of_week, 'open_time', e.target.value)}
                        className="w-28 h-8 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input
                        type="time"
                        value={h.close_time.slice(0, 5)}
                        onChange={(e) => updateHour(h.day_of_week, 'close_time', e.target.value)}
                        className="w-28 h-8 text-xs"
                      />
                      <Select
                        value={String(h.slot_minutes)}
                        onValueChange={(v) => updateHour(h.day_of_week, 'slot_minutes', Number(v))}
                      >
                        <SelectTrigger className="w-20 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 min</SelectItem>
                          <SelectItem value="10">10 min</SelectItem>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="60">60 min</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              ))}
            </Card>
          )}

          <Button onClick={saveWorkingHours} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {language === 'th' ? 'บันทึก' : 'Save'}
          </Button>
        </TabsContent>

        {/* Blackouts Tab */}
        <TabsContent value="blackouts" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? 'จัดการช่วงเวลาปิดรับนัด' : 'Manage booking blackout periods'}
            </p>
            <Button size="sm" onClick={() => openBlackoutDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              {language === 'th' ? 'เพิ่ม' : 'Add'}
            </Button>
          </div>

          {blackouts.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <CalendarOff className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{language === 'th' ? 'ยังไม่มีช่วงปิดรับนัด' : 'No blackouts configured'}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {blackouts.map(b => (
                <Card key={b.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{b.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          b.scope === 'global'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {b.scope === 'global'
                            ? (language === 'th' ? 'ทุกสาขา' : 'Global')
                            : (language === 'th' ? 'เฉพาะสาขา' : 'Branch')}
                        </span>
                        {b.is_all_day && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                            {language === 'th' ? 'ทั้งวัน' : 'All Day'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(b.start_at), 'dd MMM yyyy HH:mm')} → {format(new Date(b.end_at), 'dd MMM yyyy HH:mm')}
                      </p>
                      {b.reason && <p className="text-xs text-muted-foreground mt-1">{b.reason}</p>}
                      {b.scope === 'branch' && b.applies_to_branch_ids && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {b.applies_to_branch_ids.map(bid => (
                            <span key={bid} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                              {getBranchName(bid)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openBlackoutDialog(b)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBlackout(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Blackout Dialog */}
      <Dialog open={showBlackoutDialog} onOpenChange={setShowBlackoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBlackout
                ? (language === 'th' ? 'แก้ไขช่วงปิดรับนัด' : 'Edit Blackout')
                : (language === 'th' ? 'เพิ่มช่วงปิดรับนัด' : 'Add Blackout')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === 'th' ? 'ขอบเขต' : 'Scope'}</Label>
              <Select value={blackoutForm.scope} onValueChange={(v: 'global' | 'branch') => setBlackoutForm(f => ({ ...f, scope: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">
                    <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> {language === 'th' ? 'ทุกสาขา' : 'All branches'}</span>
                  </SelectItem>
                  <SelectItem value="branch">
                    <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> {language === 'th' ? 'เลือกสาขา' : 'Selected branches'}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {blackoutForm.scope === 'branch' && (
              <div>
                <Label>{language === 'th' ? 'เลือกสาขา' : 'Select branches'}</Label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {branches.map(b => (
                    <Button
                      key={b.id}
                      variant={blackoutForm.branch_ids.includes(b.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleBranchId(b.id)}
                    >
                      {language === 'th' ? b.name_th : b.name_en}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>{language === 'th' ? 'หัวข้อ' : 'Title'}</Label>
              <Input
                value={blackoutForm.title}
                onChange={(e) => setBlackoutForm(f => ({ ...f, title: e.target.value }))}
                placeholder={language === 'th' ? 'เช่น วันหยุดนักขัตฤกษ์' : 'e.g. Public Holiday'}
              />
            </div>

            <div>
              <Label>{language === 'th' ? 'เหตุผล' : 'Reason'} ({language === 'th' ? 'ไม่บังคับ' : 'optional'})</Label>
              <Textarea
                value={blackoutForm.reason}
                onChange={(e) => setBlackoutForm(f => ({ ...f, reason: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={blackoutForm.is_all_day}
                onCheckedChange={(v) => setBlackoutForm(f => ({ ...f, is_all_day: v }))}
              />
              <Label>{language === 'th' ? 'ทั้งวัน' : 'All Day'}</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{language === 'th' ? 'เริ่มต้น' : 'Start'}</Label>
                <Input
                  type={blackoutForm.is_all_day ? 'date' : 'datetime-local'}
                  value={blackoutForm.start_at}
                  onChange={(e) => setBlackoutForm(f => ({ ...f, start_at: e.target.value }))}
                />
              </div>
              <div>
                <Label>{language === 'th' ? 'สิ้นสุด' : 'End'}</Label>
                <Input
                  type={blackoutForm.is_all_day ? 'date' : 'datetime-local'}
                  value={blackoutForm.end_at}
                  onChange={(e) => setBlackoutForm(f => ({ ...f, end_at: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlackoutDialog(false)}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button onClick={saveBlackout} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {language === 'th' ? 'บันทึก' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{language === 'th' ? 'คัดลอกเวลาทำการ' : 'Copy Working Hours'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{language === 'th' ? 'คัดลอกจากสาขา' : 'Copy from'}</Label>
            <Select value={copySource} onValueChange={setCopySource}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'th' ? 'เลือกสาขา' : 'Select branch'} />
              </SelectTrigger>
              <SelectContent>
                {branches.filter(b => b.id !== selectedBranch).map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {language === 'th' ? b.name_th : b.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button onClick={copyFromBranch} disabled={!copySource}>
              <Copy className="h-4 w-4 mr-1" />
              {language === 'th' ? 'คัดลอก' : 'Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
