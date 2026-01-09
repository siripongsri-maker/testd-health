import { Button } from "@/components/ui/button";
import { Heart, Shield, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";
import swingLogo from "@/assets/swing-logo.webp";

export default function Landing() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 safe-top z-10">
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center safe-top relative z-10">
        {/* Logo & Icon */}
        <div className="mb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <Shield className="h-10 w-10 text-white" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">
          test<span className="text-primary">D</span>
        </h1>
        
        {/* Tagline */}
        <p className="mb-2 text-lg font-medium text-foreground">
          {t('app.tagline')}
        </p>
        
        {/* Description */}
        <p className="mb-10 max-w-sm text-muted-foreground leading-relaxed">
          {t('app.description')}
        </p>
        
        {/* Action Buttons */}
        <div className="w-full max-w-xs space-y-3">
          <Button asChild className="w-full h-12 text-base font-semibold rounded-xl">
            <Link to="/onboarding" className="gap-2">
              {t('landing.startAnonymous')}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full h-12 text-base rounded-xl">
            <Link to="/auth" className="gap-2">
              <Heart className="h-5 w-5 text-accent" />
              {t('landing.loginEmail')}
            </Link>
          </Button>
        </div>
        
        {/* Trust indicators */}
        <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
            <CheckCircle className="h-4 w-4 text-success" />
            {t('landing.anonymous')}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
            <CheckCircle className="h-4 w-4 text-primary" />
            {t('landing.secure')}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
            <CheckCircle className="h-4 w-4 text-accent" />
            {t('landing.free')}
          </div>
        </div>
      </div>
      
      {/* Footer with SWING logo */}
      <footer className="px-6 pb-8 text-center space-y-3 safe-bottom relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">{t('landing.poweredBy') || 'Powered by'}</span>
          <img 
            src={swingLogo} 
            alt="SWING Thailand" 
            className="h-6 object-contain"
          />
        </div>
        <p className="text-xs text-muted-foreground">{t('landing.disclaimer')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('landing.consult')}</p>
      </footer>
    </div>
  );
}
