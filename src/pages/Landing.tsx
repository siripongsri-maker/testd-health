import { Shield, Heart, CheckCircle, Star, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";
import swingLogo from "@/assets/swing-logo.webp";
import { CommunityStats } from "@/components/landing/CommunityStats";
import { QuickTestCTA } from "@/components/landing/QuickTestCTA";
import { CommunityTestimonial } from "@/components/landing/CommunityTestimonial";

export default function Landing() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-success/5 rounded-full blur-3xl" />
      </div>

      {/* Language Toggle */}
      <div className="absolute top-4 right-4 safe-top z-10">
        <LanguageToggle />
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 text-center safe-top relative z-10">
        {/* Logo & Icon with Animation */}
        <div className="mb-4 animate-fade-in">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary via-primary to-accent shadow-xl shadow-primary/25">
            <Shield className="h-10 w-10 text-white" />
            <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-warning animate-pulse" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="mb-1 text-4xl font-bold tracking-tight text-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
          test<span className="text-primary">D</span>
        </h1>
        
        {/* Tagline */}
        <p className="mb-1 text-lg font-semibold text-foreground animate-fade-in" style={{ animationDelay: '0.15s' }}>
          {t('app.tagline')}
        </p>
        
        {/* Description */}
        <p className="mb-5 max-w-xs text-sm text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {language === 'th' 
            ? 'ชุมชนที่ปลอดภัยสำหรับการดูแลสุขภาพของคุณ รับชุดตรวจ HIV ฟรีถึงบ้าน'
            : 'A safe community for your health. Get free HIV test kits delivered home.'}
        </p>

        {/* Community Stats - Live animated counters */}
        <div className="w-full max-w-sm mb-5 animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <CommunityStats />
        </div>

        {/* Testimonial */}
        <div className="w-full max-w-sm mb-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CommunityTestimonial />
        </div>
        
        {/* One-tap CTA */}
        <div className="animate-fade-in" style={{ animationDelay: '0.35s' }}>
          <QuickTestCTA />
        </div>
      </div>

      {/* Trust indicators */}
      <div className="px-5 pb-5 relative z-10 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
            <CheckCircle className="h-3.5 w-3.5 text-success" />
            {t('landing.anonymous')}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
            <Shield className="h-3.5 w-3.5 text-primary" />
            {t('landing.secure')}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
            <Star className="h-3.5 w-3.5 text-warning" />
            {t('landing.free')}
          </div>
        </div>
      </div>

      {/* Already have account link */}
      <div className="px-5 pb-4 text-center animate-fade-in" style={{ animationDelay: '0.45s' }}>
        <Link 
          to="/auth" 
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          <Heart className="h-4 w-4" />
          {t('landing.loginEmail')}
        </Link>
      </div>
      
      {/* Footer with SWING logo */}
      <footer className="px-5 pb-6 text-center space-y-2 safe-bottom relative z-10 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">{t('landing.poweredBy') || 'Powered by'}</span>
          <img 
            src={swingLogo} 
            alt="SWING Thailand" 
            className="h-5 object-contain"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">{t('landing.disclaimer')}</p>
        <p className="text-[10px] text-muted-foreground">{t('landing.consult')}</p>
      </footer>
    </div>
  );
}
