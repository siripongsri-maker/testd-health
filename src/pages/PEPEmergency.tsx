import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setUserData, getUserData, addBadge, getTodayKey } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, AlertTriangle, Clock, MapPin, ExternalLink, Shield } from "lucide-react";

export default function PEPEmergency() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [hoursAgo, setHoursAgo] = useState("");
  const [urgency, setUrgency] = useState<"safe" | "warning" | "urgent">("safe");

  useEffect(() => {
    const hours = parseInt(hoursAgo) || 0;
    if (hours >= 72) {
      setUrgency("urgent");
    } else if (hours >= 48) {
      setUrgency("warning");
    } else {
      setUrgency("safe");
    }
  }, [hoursAgo]);

  const getTimeRemaining = () => {
    const hours = parseInt(hoursAgo) || 0;
    const remaining = 72 - hours;
    if (remaining <= 0) return t('pep.emergency.exceeded');
    return `${remaining} ${t('pep.emergency.remaining')}`;
  };

  const handleStartPEP = () => {
    const exposureTime = new Date();
    exposureTime.setHours(exposureTime.getHours() - (parseInt(hoursAgo) || 0));
    
    setUserData({
      mode: "pep",
      pepExposureTime: exposureTime.toISOString(),
      pepStartDate: getTodayKey(),
    });
    
    addBadge("PEP Warrior");
    navigate("/pep-tracker");
  };

  const urgencyStyles = {
    safe: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    urgent: "border-urgent/30 bg-urgent/10 text-urgent",
  };

  return (
    <>
      <PageContainer>
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{t('pep.emergency.title')}</h1>
        </div>
        
        {/* Urgency Icon */}
        <div className="mb-8 flex justify-center">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full ${
            urgency === "safe" ? "bg-success/20" : urgency === "warning" ? "bg-warning/20" : "bg-urgent/20"
          } animate-pulse-soft`}>
            <Shield className={`h-10 w-10 ${
              urgency === "safe" ? "text-success" : urgency === "warning" ? "text-warning" : "text-urgent"
            }`} />
          </div>
        </div>
        
        <div className="space-y-6 animate-slide-up">
          {/* Time Input */}
          <div className="space-y-2">
            <Label htmlFor="hoursAgo" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {t('pep.emergency.when')}
            </Label>
            <div className="flex gap-2">
              <Input
                id="hoursAgo"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={hoursAgo}
                onChange={(e) => setHoursAgo(e.target.value)}
                className="h-14 text-lg"
              />
              <div className="flex items-center px-4 rounded-xl bg-muted text-muted-foreground font-medium">
                {t('pep.emergency.hoursAgo')}
              </div>
            </div>
          </div>
          
          {/* Time Remaining */}
          {hoursAgo && (
            <div className={`flex items-center gap-3 rounded-xl border-2 p-4 ${urgencyStyles[urgency]}`}>
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-bold">{getTimeRemaining()}</p>
                <p className="text-sm opacity-80">
                  {urgency === "safe" && t('pep.emergency.safe')}
                  {urgency === "warning" && t('pep.emergency.warning')}
                  {urgency === "urgent" && t('pep.emergency.urgent')}
                </p>
              </div>
            </div>
          )}
          
          {/* Info */}
          <div className="rounded-xl bg-card border border-border p-4 shadow-card">
            <h3 className="font-bold text-foreground mb-2">{t('pep.emergency.whatIs')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('pep.emergency.whatIsDesc')}
            </p>
            <p className="text-sm font-medium text-foreground">
              {t('pep.emergency.effective')}
            </p>
          </div>
          
          {/* Where to get PEP */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div>
                <h3 className="font-bold text-foreground mb-1">{t('pep.emergency.where')}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('pep.emergency.whereDesc')}
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate("/swing")} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {t('pep.emergency.findSwing')}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Start PEP Button */}
          <Button
            variant="hero"
            onClick={handleStartPEP}
            disabled={urgency === "urgent"}
            className="w-full"
          >
            {urgency === "urgent" ? t('pep.emergency.seekAdvice') : t('pep.emergency.startTracking')}
          </Button>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
