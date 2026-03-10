import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useQueueData, VisitFlow, VisitStep } from '@/hooks/useQueueData';
import { supabase } from '@/integrations/supabase/client';
import { QUEUE_STEPS, STEP_MAP, getStepLabel, ACTIVE_SERVICE_STEPS, STATUS_LABELS, type StepStatus } from '@/lib/queueSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Plus, Phone, Play, CheckCircle, XCircle, ArrowRight,
  ClipboardCheck, UserRound, Droplets, TestTube, Clock, BellRing,
  Pill, HeartPulse, CreditCard, Monitor,
} from 'lucide-react';

const STEP_ICONS: Record<string, React.ElementType> = {
  register: ClipboardCheck, counselor: UserRound, blood_collecting: Droplets,
  specimen_collecting: TestTube, waiting_result: Clock, notification_later: BellRing,
  medicine: Pill, treatment: HeartPulse, payment: CreditCard, completed: CheckCircle, cancelled: XCircle,
};

interface Props {
  userBranch?: string | null;
}

export default function AdminQueueBoardContent({ userBranch }: Props) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [branches, setBranches] = useState<{ id: string; name_th: string; name_en: string; slug: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [activeStepTab, setActiveStepTab] = useState('counselor');
  const [routeDialog, setRouteDialog] = useState<{ visit: VisitFlow; step: VisitStep; action: 'complete' } | null>(null);
  const [selectedNextStep, setSelectedNextStep] = useState('');
  const [roomNumber, setRoomNumber] = useState('');

  const { visits, steps, loading, registerVisit, routeStep } = useQueueData(selectedBranch || null);

  useEffect(() => {
    supabase.from('booking_branches').select('id, name_th, name_en, slug').eq('is_active', true).order('name_en').then(({ data }) => {
      const list = data || [];
      setBranches(list as any);
      if (userBranch) {
        const match = list.find((b: any) => b.slug === userBranch);
        if (match) setSelectedBranch((match as any).id);
      } else if (list.length > 0) {
        setSelectedBranch((list[0] as any).id);
      }
    });
  }, [userBranch]);

  const handleRegister = async () => {
    try {
      const result = await registerVisit();
      toast.success(`${isEn ? 'Registered' : 'ลงทะเบียนแล้ว'}: ${result.visit_code}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAction = async (visit: VisitFlow, step: VisitStep, action: 'call' | 'start' | 'complete' | 'cancel') => {
    if (action === 'complete') {
      const stepDef = STEP_MAP[step.step_code];
      if (stepDef && stepDef.nextOptions.length > 0) {
        setRouteDialog({ visit, step, action });
        setSelectedNextStep(stepDef.nextOptions[0]);
        return;
      }
    }
    try {
      await routeStep(visit.id, step.id, action, undefined, undefined);
      toast.success(isEn ? 'Updated' : 'อัปเดตแล้ว');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRouteConfirm = async () => {
    if (!routeDialog) return;
    try {
      await routeStep(
        routeDialog.visit.id,
        routeDialog.step.id,
        'complete',
        selectedNextStep,
        roomNumber ? parseInt(roomNumber) : undefined,
      );
      toast.success(isEn ? 'Routed successfully' : 'ส่งต่อสำเร็จ');
      setRouteDialog(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getStepsForStation = (stepCode: string) => {
    return steps
      .filter(s => s.step_code === stepCode && ['waiting', 'called', 'in_service'].includes(s.step_status))
      .sort((a, b) => {
        const order: Record<string, number> = { called: 0, in_service: 1, waiting: 2 };
        return (order[a.step_status] ?? 3) - (order[b.step_status] ?? 3) || (a.queue_number || 0) - (b.queue_number || 0);
      });
  };

  const getVisitForStep = (step: VisitStep) => visits.find(v => v.id === step.visit_id);

  const activeVisits = visits.filter(v => !v.is_completed && !v.is_cancelled);
  const completedVisits = visits.filter(v => v.is_completed || v.is_cancelled);

  const statusColor = (status: string) => {
    switch (status) {
      case 'called': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'in_service': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'waiting': return 'bg-muted text-muted-foreground';
      case 'completed': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{isEn ? 'Queue Operations' : 'ระบบคิวบริการ'}</h2>
          <p className="text-sm text-muted-foreground">{isEn ? 'Manage service queue routing' : 'จัดการเส้นทางคิวบริการ'}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={isEn ? 'Select branch' : 'เลือกสาขา'} />
            </SelectTrigger>
            <SelectContent>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>{isEn ? b.name_en : b.name_th}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRegister} disabled={!selectedBranch}>
            <Plus className="h-4 w-4 mr-1" />
            {isEn ? 'Register Visit' : 'ลงทะเบียนคิว'}
          </Button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{activeVisits.length}</div>
          <div className="text-xs text-muted-foreground">{isEn ? 'Active' : 'กำลังให้บริการ'}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{visits.length}</div>
          <div className="text-xs text-muted-foreground">{isEn ? 'Total Today' : 'ทั้งหมดวันนี้'}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{completedVisits.filter(v => v.is_completed).length}</div>
          <div className="text-xs text-muted-foreground">{isEn ? 'Completed' : 'เสร็จสิ้น'}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-destructive">{completedVisits.filter(v => v.is_cancelled).length}</div>
          <div className="text-xs text-muted-foreground">{isEn ? 'Cancelled' : 'ยกเลิก'}</div>
        </CardContent></Card>
      </div>

      {/* Station tabs */}
      <Tabs value={activeStepTab} onValueChange={setActiveStepTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {ACTIVE_SERVICE_STEPS.map(code => {
            const Icon = STEP_ICONS[code] || ClipboardCheck;
            const count = getStepsForStation(code).length;
            return (
              <TabsTrigger key={code} value={code} className="text-xs gap-1">
                <Icon className="h-3.5 w-3.5" />
                {getStepLabel(code, language as any)}
                {count > 0 && <span className="ml-1 bg-primary/20 text-primary rounded-full px-1.5 text-[10px]">{count}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ACTIVE_SERVICE_STEPS.map(code => (
          <TabsContent key={code} value={code} className="mt-3">
            <div className="space-y-2">
              {getStepsForStation(code).length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {isEn ? 'No queue at this station' : 'ไม่มีคิวที่สถานีนี้'}
                </div>
              )}
              {getStepsForStation(code).map(step => {
                const visit = getVisitForStep(step);
                if (!visit) return null;
                const stepDef = STEP_MAP[code];
                return (
                  <Card key={step.id} className={`border ${step.step_status === 'called' ? 'border-amber-500/50 bg-amber-500/5' : step.step_status === 'in_service' ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold font-mono text-foreground">{visit.visit_code}</div>
                        <div>
                          <Badge variant="outline" className={statusColor(step.step_status)}>
                            {STATUS_LABELS[step.step_status as StepStatus]?.[language as 'th' | 'en'] || step.step_status}
                          </Badge>
                          {step.room_number && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {isEn ? `Room ${step.room_number}` : `ห้อง ${step.room_number}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {step.step_status === 'waiting' && (
                          <Button size="sm" variant="outline" onClick={() => handleAction(visit, step, 'call')}>
                            <Phone className="h-3.5 w-3.5 mr-1" />
                            {isEn ? 'Call' : 'เรียก'}
                          </Button>
                        )}
                        {step.step_status === 'called' && (
                          <Button size="sm" variant="outline" onClick={() => handleAction(visit, step, 'start')}>
                            <Play className="h-3.5 w-3.5 mr-1" />
                            {isEn ? 'Start' : 'เริ่ม'}
                          </Button>
                        )}
                        {(step.step_status === 'called' || step.step_status === 'in_service') && (
                          <>
                            <Button size="sm" onClick={() => handleAction(visit, step, 'complete')}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              {isEn ? 'Complete' : 'เสร็จ'}
                            </Button>
                            {stepDef?.canCancel && (
                              <Button size="sm" variant="destructive" onClick={() => handleAction(visit, step, 'cancel')}>
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* All visits overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{isEn ? "Today's Visits" : 'คิววันนี้ทั้งหมด'}</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-1">
            {visits.map(v => {
              const Icon = STEP_ICONS[v.current_step] || ClipboardCheck;
              return (
                <div key={v.id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${v.is_completed ? 'opacity-50' : v.is_cancelled ? 'opacity-30 line-through' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{v.visit_code}</span>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{getStepLabel(v.current_step, language as any)}</span>
                  </div>
                  <Badge variant="outline" className={statusColor(v.current_status)}>
                    {STATUS_LABELS[v.current_status as StepStatus]?.[language as 'th' | 'en'] || v.current_status}
                  </Badge>
                </div>
              );
            })}
            {visits.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">{isEn ? 'No visits today' : 'ยังไม่มีคิววันนี้'}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* TV Display link */}
      {selectedBranch && (
        <div className="text-center">
          <Button variant="outline" size="sm" asChild>
            <a href={`/queue-tv/${branches.find(b => b.id === selectedBranch)?.slug || selectedBranch}`} target="_blank" rel="noopener noreferrer">
              <Monitor className="h-4 w-4 mr-1" />
              {isEn ? 'Open TV Display' : 'เปิดหน้าจอทีวี'}
            </a>
          </Button>
        </div>
      )}

      {/* Route dialog */}
      <Dialog open={!!routeDialog} onOpenChange={(open) => !open && setRouteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEn ? 'Route to Next Step' : 'ส่งต่อไปขั้นตอนถัดไป'}</DialogTitle>
          </DialogHeader>
          {routeDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isEn ? `Queue ${routeDialog.visit.visit_code} — completing ${getStepLabel(routeDialog.step.step_code, 'en')}` : `คิว ${routeDialog.visit.visit_code} — เสร็จ${getStepLabel(routeDialog.step.step_code, 'th')}`}
              </p>
              <Select value={selectedNextStep} onValueChange={setSelectedNextStep}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(STEP_MAP[routeDialog.step.step_code]?.nextOptions || []).map(code => (
                    <SelectItem key={code} value={code}>
                      {code === 'cancelled' ? (isEn ? '❌ Cancel Visit' : '❌ ยกเลิก') : getStepLabel(code, language as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={isEn ? 'Room number (optional)' : 'หมายเลขห้อง (ไม่บังคับ)'}
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                type="number"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteDialog(null)}>{isEn ? 'Cancel' : 'ยกเลิก'}</Button>
            <Button onClick={handleRouteConfirm}>
              <ArrowRight className="h-4 w-4 mr-1" />
              {isEn ? 'Confirm Route' : 'ยืนยันส่งต่อ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
