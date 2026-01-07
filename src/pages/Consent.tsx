import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { setUserData } from "@/lib/store";
import { Shield, Eye, TrendingUp, Lock } from "lucide-react";

export default function Consent() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  const handleContinue = () => {
    setUserData({ consentGiven: true, onboardingComplete: true });
    navigate("/dashboard");
  };

  const features = [
    { icon: Eye, text: "Anonymous usage data only" },
    { icon: Lock, text: "No personal identity required" },
    { icon: TrendingUp, text: "Helps improve services" },
  ];

  return (
    <div className="min-h-screen gradient-hero flex flex-col px-6 py-8 safe-top safe-bottom">
      {/* Progress */}
      <ProgressIndicator current={3} total={3} className="mb-8" />
      
      {/* Icon */}
      <div className="mb-8 flex justify-center animate-bounce-gentle">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-10 w-10 text-primary" />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
          Your privacy matters
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          We believe in transparency about how we use data to help you and the community.
        </p>
        
        {/* Features */}
        <div className="space-y-4 mb-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-4 rounded-xl bg-card border border-border p-4 shadow-card animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
                  <Icon className="h-5 w-5 text-success" />
                </div>
                <span className="font-medium text-foreground">{feature.text}</span>
              </div>
            );
          })}
        </div>
        
        {/* Consent checkbox */}
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-1"
            />
            <span className="text-sm text-foreground leading-relaxed">
              I agree to anonymous data collection to help improve testD and support sexual health advocacy. 
              I understand no personal information is required.
            </span>
          </label>
        </div>
      </div>
      
      {/* Continue button */}
      <div className="mt-8">
        <Button
          variant="hero"
          onClick={handleContinue}
          disabled={!agreed}
          className="w-full"
        >
          Continue to testD
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-4">
          You can change this anytime in settings
        </p>
      </div>
    </div>
  );
}
