import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { LanguageToggle } from "@/components/LanguageToggle";
import { setUserData } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { Shield, Eye, TrendingUp, Lock } from "lucide-react";

export default function Consent() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [agreed, setAgreed] = useState(false);

  const handleContinue = () => {
    setUserData({ consentGiven: true, onboardingComplete: true });
    navigate("/dashboard");
  };

  const features = [
    { icon: Eye, text: t('consent.anonymous') },
    { icon: Lock, text: t('consent.noIdentity') },
    { icon: TrendingUp, text: t('consent.improve') },
  ];

  return (
    <div className="min-h-screen gradient-hero flex flex-col px-6 py-8 safe-top safe-bottom">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

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
          {t('consent.title')}
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          {t('consent.subtitle')}
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
              {t('consent.agree')}
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
          {t('consent.continue')}
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-4">
          {t('consent.changeAnytime')}
        </p>
      </div>
    </div>
  );
}
