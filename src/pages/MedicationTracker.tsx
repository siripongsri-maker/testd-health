import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserData, recordCheckIn, getTodayKey, getCheckInDetails, setUserData, CheckInRecord } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { 
  ArrowLeft, 
  Pill, 
  Clock, 
  Check, 
  X, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  List
} from "lucide-react";
import { toast } from "sonner";
import { 
  format, 
  subDays, 
  parseISO, 
  differenceInMinutes, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  getDay,
  isToday,
  isFuture
} from "date-fns";
import { th, enUS } from "date-fns/locale";

interface DayRecord {
  date: string;
  dayLabel: string;
  status: 'taken' | 'skipped' | 'pending' | 'future';
  scheduledTime?: string;
  actualTime?: string;
  timeDiff?: number; // minutes difference
}

export default function MedicationTracker() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [userData, setLocalUserData] = useState(getUserData());
  const [todayStatus, setTodayStatus] = useState<"pending" | "taken" | "skipped">("pending");
  const [weekRecords, setWeekRecords] = useState<DayRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<string>("week");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = getUserData();
    setLocalUserData(data);
    
    const today = getTodayKey();
    if (data.checkIns[today]) {
      setTodayStatus(data.checkIns[today]);
    }

    // Build last 7 days records
    const records: DayRecord[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, 'yyyy-MM-dd');
      const details = data.checkInDetails[dateKey];
      const status = data.checkIns[dateKey];
      
      let timeDiff: number | undefined;
      if (details?.time && details?.scheduledTime) {
        const actualTime = parseISO(details.time);
        const [hours, mins] = details.scheduledTime.split(':').map(Number);
        const scheduled = new Date(actualTime);
        scheduled.setHours(hours, mins, 0, 0);
        timeDiff = differenceInMinutes(actualTime, scheduled);
      }

      records.push({
        date: dateKey,
        dayLabel: format(date, 'EEE'),
        status: i === 0 
          ? (status || 'pending') 
          : (status || (i > 0 ? 'future' : 'pending')),
        scheduledTime: details?.scheduledTime || data.prepReminderTime || '09:00',
        actualTime: details?.time ? format(parseISO(details.time), 'HH:mm') : undefined,
        timeDiff,
      });
    }
    setWeekRecords(records);
  };

  const handleTaken = () => {
    const today = getTodayKey();
    recordCheckIn(today, "taken");
    setTodayStatus("taken");
    loadData();
    
    toast.success(language === 'th' ? 'ดีมาก! กินยาแล้ววันนี้' : 'Great! Medication taken today', {
      description: `${language === 'th' ? 'Streak' : 'Streak'}: ${getUserData().streak} 🔥`,
    });
  };

  const handleSkipped = () => {
    const today = getTodayKey();
    recordCheckIn(today, "skipped");
    setTodayStatus("skipped");
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken': return 'bg-emerald-500 text-white';
      case 'skipped': return 'bg-red-400 text-white';
      case 'pending': return 'bg-amber-400 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTimeDiffLabel = (diff: number | undefined) => {
    if (diff === undefined) return null;
    if (Math.abs(diff) <= 15) return { text: language === 'th' ? 'ตรงเวลา!' : 'On time!', color: 'text-emerald-600' };
    if (diff > 0) return { text: `+${diff} ${language === 'th' ? 'นาที' : 'min'}`, color: diff > 60 ? 'text-amber-600' : 'text-muted-foreground' };
    return { text: `${diff} ${language === 'th' ? 'นาที' : 'min'}`, color: 'text-blue-600' };
  };

  const modeLabels = {
    'prep-daily': { th: 'PrEP รายวัน', en: 'Daily PrEP' },
    'prep-ondemand': { th: 'PrEP ตามเหตุการณ์', en: 'On-Demand PrEP' },
    'pep': { th: 'PEP', en: 'PEP' },
    'exploring': { th: 'สำรวจ', en: 'Exploring' },
  };

  const currentMode = userData.mode || 'exploring';
  const modeLabel = modeLabels[currentMode as keyof typeof modeLabels] || modeLabels.exploring;

  // Calculate on-time percentage
  const takenDays = weekRecords.filter(r => r.status === 'taken');
  const onTimeDays = takenDays.filter(r => r.timeDiff !== undefined && Math.abs(r.timeDiff) <= 30);
  const onTimePercentage = takenDays.length > 0 ? Math.round((onTimeDays.length / takenDays.length) * 100) : 0;

  return (
    <PageContainer className="pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/")}
            className="rounded-xl hover:bg-muted/80 h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {language === 'th' ? 'ติดตามการกินยา' : 'Medication Tracker'}
            </h1>
            <p className="text-sm text-muted-foreground">{modeLabel[language as 'th' | 'en']}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/settings")}
          className="rounded-xl hover:bg-muted/80 h-10 w-10"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Current Schedule Card */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
            <Pill className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? 'เวลาที่ตั้งไว้' : 'Scheduled Time'}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {userData.prepReminderTime || '09:00'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? 'Streak' : 'Streak'}
            </p>
            <p className="text-2xl font-bold text-primary">{userData.streak} 🔥</p>
          </div>
        </div>

        {/* Today's Check-in */}
        {todayStatus === 'pending' ? (
          <div className="flex gap-2">
            <Button
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
              onClick={handleTaken}
            >
              <Check className="h-5 w-5 mr-2" />
              {language === 'th' ? 'กินแล้ว' : 'Taken'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl"
              onClick={handleSkipped}
            >
              <X className="h-5 w-5 mr-2" />
              {language === 'th' ? 'ข้าม' : 'Skip'}
            </Button>
          </div>
        ) : (
          <div className={`flex items-center justify-center gap-2 py-3 rounded-xl ${
            todayStatus === 'taken' 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {todayStatus === 'taken' ? (
              <>
                <Check className="h-5 w-5" />
                <span className="font-medium">
                  {language === 'th' ? 'กินแล้ววันนี้' : 'Taken today'}
                  {weekRecords[6]?.actualTime && ` • ${weekRecords[6].actualTime}`}
                </span>
              </>
            ) : (
              <>
                <X className="h-5 w-5" />
                <span>{language === 'th' ? 'ข้ามวันนี้' : 'Skipped today'}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">
              {language === 'th' ? 'ตรงเวลา' : 'On-Time Rate'}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{onTimePercentage}%</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {language === 'th' ? 'สัปดาห์นี้' : 'This Week'}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {takenDays.length}/7
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="week" className="rounded-lg gap-2">
            <List className="h-4 w-4" />
            {language === 'th' ? '7 วัน' : '7 Days'}
          </TabsTrigger>
          <TabsTrigger value="month" className="rounded-lg gap-2">
            <Calendar className="h-4 w-4" />
            {language === 'th' ? 'ปฏิทิน' : 'Calendar'}
          </TabsTrigger>
        </TabsList>

        {/* Weekly View */}
        <TabsContent value="week" className="mt-4">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {language === 'th' ? 'ประวัติ 7 วัน' : 'Last 7 Days'}
          </h2>
          
          <div className="space-y-2">
            {weekRecords.map((record, idx) => (
              <div 
                key={record.date}
                className={`rounded-xl border p-4 ${
                  idx === 6 ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getStatusColor(record.status)}`}>
                      {record.status === 'taken' && <Check className="h-5 w-5" />}
                      {record.status === 'skipped' && <X className="h-5 w-5" />}
                      {record.status === 'pending' && <Clock className="h-5 w-5" />}
                      {record.status === 'future' && <span className="text-xs">—</span>}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {idx === 6 
                          ? (language === 'th' ? 'วันนี้' : 'Today')
                          : record.dayLabel
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(record.date), 'd MMM')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {record.status === 'taken' && record.actualTime && (
                      <>
                        <p className="font-medium text-foreground">{record.actualTime}</p>
                        {record.timeDiff !== undefined && (
                          <p className={`text-xs ${getTimeDiffLabel(record.timeDiff)?.color}`}>
                            {getTimeDiffLabel(record.timeDiff)?.text}
                          </p>
                        )}
                      </>
                    )}
                    {record.status === 'skipped' && (
                      <p className="text-sm text-red-500">
                        {language === 'th' ? 'ข้าม' : 'Skipped'}
                      </p>
                    )}
                    {record.status === 'pending' && (
                      <p className="text-sm text-amber-500">
                        {language === 'th' ? 'รอ' : 'Pending'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Monthly Calendar View */}
        <TabsContent value="month" className="mt-4">
          <MonthlyCalendar 
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            checkIns={userData.checkIns}
            checkInDetails={userData.checkInDetails}
            language={language}
          />
        </TabsContent>
      </Tabs>

      {/* Schedule Info */}
      <div className="rounded-xl bg-muted/50 border border-border p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">
              {language === 'th' 
                ? 'การกินยาตรงเวลาช่วยเพิ่มประสิทธิภาพในการป้องกัน HIV คุณสามารถเปลี่ยนเวลานัดได้ในหน้าตั้งค่า'
                : 'Taking medication on time increases HIV prevention effectiveness. You can change your scheduled time in settings.'
              }
            </p>
            <Button 
              variant="link" 
              className="p-0 h-auto text-primary"
              onClick={() => navigate("/settings")}
            >
              {language === 'th' ? 'ไปที่ตั้งค่า →' : 'Go to Settings →'}
            </Button>
          </div>
        </div>
      </div>

      {/* Setup Button if not configured */}
      {(!userData.mode || userData.mode === 'exploring') && (
        <div className="mt-6 space-y-3">
          <Button
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90"
            onClick={() => {
              setUserData({ mode: 'prep-daily' });
              navigate('/setup/prep-daily');
            }}
          >
            {language === 'th' ? 'ตั้งค่า PrEP รายวัน' : 'Setup Daily PrEP'}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            onClick={() => {
              setUserData({ mode: 'pep' });
              navigate('/pep');
            }}
          >
            {language === 'th' ? 'เริ่ม PEP' : 'Start PEP'}
          </Button>
        </div>
      )}
    </PageContainer>
  );
}

// Monthly Calendar Component
interface MonthlyCalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  checkIns: Record<string, 'taken' | 'skipped'>;
  checkInDetails: Record<string, CheckInRecord>;
  language: string;
}

function MonthlyCalendar({ currentMonth, onMonthChange, checkIns, checkInDetails, language }: MonthlyCalendarProps) {
  const locale = language === 'th' ? th : enUS;
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get day of week for first day (0 = Sunday)
  const startDayOfWeek = getDay(monthStart);
  
  // Create empty slots for days before month starts
  const emptySlots = Array(startDayOfWeek).fill(null);
  
  const getDayStatus = (date: Date): 'taken' | 'skipped' | 'pending' | 'future' | 'none' => {
    const dateKey = format(date, 'yyyy-MM-dd');
    if (isFuture(date) && !isToday(date)) return 'future';
    if (isToday(date) && !checkIns[dateKey]) return 'pending';
    return checkIns[dateKey] || 'none';
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'taken': return 'bg-emerald-500';
      case 'skipped': return 'bg-red-400';
      case 'pending': return 'bg-amber-400';
      default: return 'bg-transparent';
    }
  };

  const weekDays = language === 'th' 
    ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Calculate monthly stats
  const monthDays = daysInMonth.filter(d => !isFuture(d) || isToday(d));
  const takenCount = monthDays.filter(d => checkIns[format(d, 'yyyy-MM-dd')] === 'taken').length;
  const skippedCount = monthDays.filter(d => checkIns[format(d, 'yyyy-MM-dd')] === 'skipped').length;
  const trackedDays = takenCount + skippedCount;
  const adherenceRate = trackedDays > 0 ? Math.round((takenCount / trackedDays) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="rounded-xl"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-bold text-foreground">
          {format(currentMonth, 'MMMM yyyy', { locale })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="rounded-xl"
          disabled={isSameMonth(currentMonth, new Date())}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{takenCount}</p>
          <p className="text-xs text-muted-foreground">{language === 'th' ? 'กินแล้ว' : 'Taken'}</p>
        </div>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
          <p className="text-2xl font-bold text-red-500">{skippedCount}</p>
          <p className="text-xs text-muted-foreground">{language === 'th' ? 'ข้าม' : 'Skipped'}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-3">
          <p className="text-2xl font-bold text-primary">{adherenceRate}%</p>
          <p className="text-xs text-muted-foreground">{language === 'th' ? 'อัตรา' : 'Rate'}</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl bg-card border border-border p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, i) => (
            <div 
              key={i} 
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty slots */}
          {emptySlots.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {/* Days of month */}
          {daysInMonth.map((day) => {
            const status = getDayStatus(day);
            const dateKey = format(day, 'yyyy-MM-dd');
            const details = checkInDetails[dateKey];
            
            return (
              <div
                key={dateKey}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-lg
                  text-sm font-medium transition-colors relative
                  ${isToday(day) ? 'ring-2 ring-primary ring-offset-2' : ''}
                  ${status === 'taken' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : ''}
                  ${status === 'skipped' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : ''}
                  ${status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : ''}
                  ${status === 'future' || status === 'none' ? 'text-muted-foreground' : ''}
                `}
              >
                <span>{format(day, 'd')}</span>
                {status !== 'future' && status !== 'none' && (
                  <div className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${getStatusDot(status)}`} />
                )}
                {details?.time && (
                  <span className="text-[8px] text-muted-foreground">
                    {format(parseISO(details.time), 'HH:mm')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span>{language === 'th' ? 'กินแล้ว' : 'Taken'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <span>{language === 'th' ? 'ข้าม' : 'Skipped'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <span>{language === 'th' ? 'รอ' : 'Pending'}</span>
        </div>
      </div>
    </div>
  );
}