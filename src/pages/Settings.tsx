import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserData, setUserData, resetUserData } from "@/lib/store";
import { ArrowLeft, Bell, Pill, Clock, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(getUserData().notificationSettings);
  
  useEffect(() => {
    const data = getUserData();
    setSettings(data.notificationSettings);
  }, []);

  const updateSetting = (key: keyof typeof settings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setUserData({ notificationSettings: newSettings });
  };

  const handleReset = () => {
    if (confirm("Are you sure? This will reset all your progress.")) {
      resetUserData();
      toast.success("Data reset successfully");
      navigate("/");
    }
  };

  return (
    <>
      <PageContainer>
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>
        
        {/* Notifications Section */}
        <div className="mb-8 animate-slide-up">
          <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </h2>
          
          <div className="space-y-4">
            {/* Daily PrEP */}
            <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Daily PrEP</p>
                  <p className="text-sm text-muted-foreground">Daily reminder</p>
                </div>
              </div>
              <Switch
                checked={settings.dailyPrep}
                onCheckedChange={(checked) => updateSetting("dailyPrep", checked)}
              />
            </div>
            
            {/* On-demand PrEP */}
            <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">On-demand PrEP</p>
                  <p className="text-sm text-muted-foreground">Event-based reminders</p>
                </div>
              </div>
              <Switch
                checked={settings.onDemandPrep}
                onCheckedChange={(checked) => updateSetting("onDemandPrep", checked)}
              />
            </div>
            
            {/* PEP Daily */}
            <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-foreground">PEP Reminders</p>
                  <p className="text-sm text-muted-foreground">28-day course reminders</p>
                </div>
              </div>
              <Switch
                checked={settings.pepDaily}
                onCheckedChange={(checked) => updateSetting("pepDaily", checked)}
              />
            </div>
          </div>
        </div>
        
        {/* Reminder Time */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="mb-4 text-lg font-bold text-foreground">Reminder Time</h2>
          
          <div className="rounded-xl bg-card border border-border p-4 shadow-card">
            <Label htmlFor="reminderTime" className="text-muted-foreground mb-2 block">
              Default notification time
            </Label>
            <Input
              id="reminderTime"
              type="time"
              value={settings.reminderTime}
              onChange={(e) => updateSetting("reminderTime", e.target.value)}
              className="h-14 text-lg"
            />
          </div>
        </div>
        
        {/* Data Section */}
        <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="mb-4 text-lg font-bold text-foreground">Data</h2>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleReset}
          >
            <Trash2 className="h-5 w-5" />
            Reset All Data
          </Button>
          
          <p className="mt-3 text-xs text-muted-foreground text-center">
            This will delete all your progress, settings, and badges
          </p>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
