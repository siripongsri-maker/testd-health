import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setUserData, addBadge, getTodayKey } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, Calendar, Clock, Info, Pill } from "lucide-react";

export default function SetupPrepDaily() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(getTodayKey());
  const [stopDate, setStopDate] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");

  const handleStart = () => {
    setUserData({
      mode: "prep-daily",
      prepStartDate: startDate,
      prepStopDate: stopDate || undefined,
      prepReminderTime: reminderTime,
    });
    
    addBadge("Started PrEP Journey");
    navigate("/dashboard");
  };

  return (
    <PageContainer showNav={false}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{t('setup.daily.title')}</h1>
      </div>
      
      {/* Icon */}
      <div className="mb-8 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary shadow-soft animate-bounce-gentle">
          <Pill className="h-10 w-10 text-primary-foreground" />
        </div>
      </div>
      
      {/* Form */}
      <div className="space-y-6 animate-slide-up">
        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {t('setup.daily.startDate')}
          </Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-14 text-lg"
          />
        </div>
        
        {/* Stop Date (optional) */}
        <div className="space-y-2">
          <Label htmlFor="stopDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {t('setup.daily.stopDate')}
          </Label>
          <Input
            id="stopDate"
            type="date"
            value={stopDate}
            onChange={(e) => setStopDate(e.target.value)}
            className="h-14 text-lg"
          />
        </div>
        
        {/* Reminder Time */}
        <div className="space-y-2">
          <Label htmlFor="reminderTime" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {t('setup.daily.reminderTime')}
          </Label>
          <Input
            id="reminderTime"
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="h-14 text-lg"
          />
        </div>
        
        {/* Info Note */}
        <div className="flex gap-3 rounded-xl bg-primary/5 border border-primary/20 p-4">
          <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <p className="text-sm text-foreground">
            {t('setup.daily.info')}
          </p>
        </div>
        
        {/* Start Button */}
        <Button variant="hero" onClick={handleStart} className="w-full mt-8">
          {t('setup.daily.start')}
        </Button>
      </div>
    </PageContainer>
  );
}
