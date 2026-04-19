import { Shield, Heart, CheckCircle, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";
import swingLogo from "@/assets/swing-logo.png";
import { CommunityStats } from "@/components/landing/CommunityStats";
import { QuickTestCTA } from "@/components/landing/QuickTestCTA";
import { CommunityTestimonial } from "@/components/landing/CommunityTestimonial";
import { HeroLivingScene } from "@/components/landing/HeroLivingScene";

export default function Landing() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Skip to main content */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none">
        {language === 'th' ? 'ข้ามไปเนื้อหาหลัก' : 'Skip to main content'}
      </a>

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-success/5 rounded-full blur-3xl" />
      </div>

      {/* Language Toggle */}
      <div className="absolute top-4 right-4 safe-top z-10">
        <LanguageToggle />
      </div>

      {/* Hero Section */}
      <main id="main-content" className="flex-1 flex flex-col items-center px-4 pt-4 pb-6 safe-top relative z-10">
        {/* Wordmark */}
        <div className="text-center mb-3 animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            test<span className="text-primary">D</span>
          </h1>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
            {t('app.tagline')}
          </p>
        </div>

        {/* Living photograph hero — interactive looping clinic scene */}
        <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <HeroLivingScene />
        </div>

        {/* Warm one-line invitation */}
        <p className="mt-4 mb-4 max-w-sm text-center text-sm text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {language === 'th'
            ? 'ที่นี่คือพื้นที่ปลอดภัย เป็นกันเอง สำหรับทุกคน เริ่มดูแลตัวเองได้เลย'
            : 'A safe, friendly space for everyone. Start taking care of yourself today.'}
        </p>

        {/* Community Stats */}
        <div className="w-full max-w-md mb-4 animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <CommunityStats />
        </div>

        {/* Testimonial */}
        <div className="w-full max-w-md mb-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CommunityTestimonial />
        </div>

        {/* Secondary one-tap CTA (kit-by-mail) */}
        <div className="animate-fade-in" style={{ animationDelay: '0.35s' }}>
          <QuickTestCTA />
        </div>
      </main>

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
