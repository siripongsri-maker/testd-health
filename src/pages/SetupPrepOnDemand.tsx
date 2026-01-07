import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setUserData, addBadge } from "@/lib/store";
import { ArrowLeft, Calendar, Clock, Info, Pill, Check } from "lucide-react";

export default function SetupPrepOnDemand() {
  const navigate = useNavigate();
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("20:00");

  const getTimeline = () => {
    if (!eventDate) return null;
    
    const event = new Date(`${eventDate}T${eventTime}`);
    const dose1 = new Date(event.getTime() - 24 * 60 * 60 * 1000); // 24h before
    const dose2 = new Date(event.getTime() - 2 * 60 * 60 * 1000); // 2h before
    const dose3 = new Date(event.getTime() + 24 * 60 * 60 * 1000); // 24h after
    const dose4 = new Date(event.getTime() + 48 * 60 * 60 * 1000); // 48h after
    
    return [
      { label: "First dose (2 pills)", time: dose1, status: dose1 < new Date() ? "done" : "upcoming" },
      { label: "Second dose", time: dose2, status: "upcoming" },
      { label: "Activity", time: event, status: "event" },
      { label: "Third dose", time: dose3, status: "upcoming" },
      { label: "Fourth dose", time: dose4, status: "upcoming" },
    ];
  };

  const timeline = getTimeline();

  const formatTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleStart = () => {
    setUserData({
      mode: "prep-ondemand",
      onDemandEventDate: `${eventDate}T${eventTime}`,
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
        <h1 className="text-xl font-bold text-foreground">On-Demand PrEP</h1>
      </div>
      
      {/* Icon */}
      <div className="mb-8 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-accent shadow-soft animate-bounce-gentle">
          <Clock className="h-10 w-10 text-primary-foreground" />
        </div>
      </div>
      
      {/* Form */}
      <div className="space-y-6 animate-slide-up">
        {/* Event Date */}
        <div className="space-y-2">
          <Label htmlFor="eventDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Planned Activity Date
          </Label>
          <Input
            id="eventDate"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="h-14 text-lg"
          />
        </div>
        
        {/* Event Time */}
        <div className="space-y-2">
          <Label htmlFor="eventTime" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Approximate Time
          </Label>
          <Input
            id="eventTime"
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            className="h-14 text-lg"
          />
        </div>
        
        {/* Timeline Preview */}
        {timeline && (
          <div className="rounded-xl bg-card border border-border p-4 shadow-card space-y-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              Your dose timeline
            </h3>
            <div className="space-y-2">
              {timeline.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 rounded-lg p-3 ${
                    item.status === "event"
                      ? "bg-accent/10 border border-accent/30"
                      : item.status === "done"
                      ? "bg-success/10"
                      : "bg-muted/50"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      item.status === "done"
                        ? "bg-success"
                        : item.status === "event"
                        ? "bg-accent"
                        : "bg-primary/20"
                    }`}
                  >
                    {item.status === "done" ? (
                      <Check className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <span className="text-xs font-bold text-foreground">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Info Note */}
        <div className="flex gap-3 rounded-xl bg-primary/5 border border-primary/20 p-4">
          <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <p className="text-sm text-foreground">
            On-demand PrEP (2-1-1) requires taking 2 pills 2-24 hours before, then 1 pill at 24h and 48h after activity.
          </p>
        </div>
        
        {/* Start Button */}
        <Button
          variant="hero"
          onClick={handleStart}
          disabled={!eventDate}
          className="w-full mt-8"
        >
          Start On-Demand PrEP
        </Button>
      </div>
    </PageContainer>
  );
}
