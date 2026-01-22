import { Button } from "@/components/ui/button";
import { Heart, Shield, ArrowRight, CheckCircle, Pill, TestTube, Users, BookOpen, Star, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";
import swingLogo from "@/assets/swing-logo.webp";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const { t, language } = useLanguage();

  const features = [
    {
      icon: Pill,
      titleTh: "ติดตาม PrEP/PEP",
      titleEn: "Track PrEP/PEP",
      descTh: "เตือนทานยาทุกวัน พร้อมติดตามความก้าวหน้า",
      descEn: "Daily medication reminders with progress tracking",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: TestTube,
      titleTh: "ตรวจ HIV ฟรี",
      titleEn: "Free HIV Testing",
      descTh: "สั่งชุดตรวจ HIV ส่งถึงบ้าน ไม่เสียค่าใช้จ่าย",
      descEn: "Order free HIV self-test kits delivered to your door",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: Users,
      titleTh: "ชุมชนที่ปลอดภัย",
      titleEn: "Safe Community",
      descTh: "พูดคุยแลกเปลี่ยนกับผู้อื่นโดยไม่เปิดเผยตัวตน",
      descEn: "Connect anonymously with others in a supportive space",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: BookOpen,
      titleTh: "ความรู้ที่เชื่อถือได้",
      titleEn: "Trusted Information",
      descTh: "บทความและข้อมูลจากผู้เชี่ยวชาญด้านสุขภาพ",
      descEn: "Expert health articles and resources",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const stats = [
    { value: "100%", labelTh: "ฟรี", labelEn: "Free" },
    { value: "24/7", labelTh: "เข้าถึงได้", labelEn: "Access" },
    { value: "5K+", labelTh: "ผู้ใช้", labelEn: "Users" },
  ];

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
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center safe-top relative z-10">
        {/* Logo & Icon with Animation */}
        <div className="mb-6 animate-fade-in">
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary via-primary to-accent shadow-xl shadow-primary/25">
            <Shield className="h-12 w-12 text-white" />
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-warning animate-pulse" />
          </div>
        </div>
        
        {/* Title with Animation */}
        <h1 className="mb-2 text-5xl font-bold tracking-tight text-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
          test<span className="text-primary">D</span>
        </h1>
        
        {/* Tagline */}
        <p className="mb-1 text-xl font-semibold text-foreground animate-fade-in" style={{ animationDelay: '0.15s' }}>
          {t('app.tagline')}
        </p>
        
        {/* Description */}
        <p className="mb-6 max-w-sm text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {t('app.description')}
        </p>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-6 mb-8 animate-fade-in" style={{ animationDelay: '0.25s' }}>
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{language === 'th' ? stat.labelTh : stat.labelEn}</div>
            </div>
          ))}
        </div>
        
        {/* Action Buttons */}
        <div className="w-full max-w-xs space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button asChild className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover-scale">
            <Link to="/onboarding" className="gap-3">
              <Sparkles className="h-5 w-5" />
              {language === 'th' ? 'เริ่มต้นใช้งานเลย' : 'Get Started Free'}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full h-12 text-base rounded-xl border-2 hover-scale">
            <Link to="/auth" className="gap-2">
              <Heart className="h-5 w-5 text-accent" />
              {t('landing.loginEmail')}
            </Link>
          </Button>

          <p className="text-xs text-muted-foreground pt-2">
            {language === 'th' ? 'ไม่ต้องสมัครสมาชิก • ใช้งานได้ทันที' : 'No signup required • Start instantly'}
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-6 pb-6 relative z-10">
        <h2 className="text-center text-lg font-semibold mb-4 text-foreground animate-fade-in" style={{ animationDelay: '0.35s' }}>
          {language === 'th' ? 'ฟีเจอร์หลัก' : 'Key Features'}
        </h2>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all hover-scale animate-fade-in cursor-pointer"
              style={{ animationDelay: `${0.4 + index * 0.05}s` }}
            >
              <CardContent className="p-4 text-center">
                <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${feature.bgColor}`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1">
                  {language === 'th' ? feature.titleTh : feature.titleEn}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {language === 'th' ? feature.descTh : feature.descEn}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Trust indicators */}
      <div className="px-6 pb-6 relative z-10 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
            <CheckCircle className="h-4 w-4 text-success" />
            {t('landing.anonymous')}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
            <Shield className="h-4 w-4 text-primary" />
            {t('landing.secure')}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
            <Star className="h-4 w-4 text-warning" />
            {t('landing.free')}
          </div>
        </div>
      </div>

      {/* Quick Start CTA */}
      <div className="px-6 pb-6 relative z-10 animate-fade-in" style={{ animationDelay: '0.65s' }}>
        <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-success/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-foreground mb-2">
              {language === 'th' ? '🎯 พร้อมดูแลสุขภาพของคุณแล้วหรือยัง?' : '🎯 Ready to take control of your health?'}
            </p>
            <Button asChild size="sm" className="rounded-full px-6">
              <Link to="/onboarding" className="gap-2">
                {language === 'th' ? 'เริ่มเลย' : 'Start Now'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Footer with SWING logo */}
      <footer className="px-6 pb-8 text-center space-y-3 safe-bottom relative z-10 animate-fade-in" style={{ animationDelay: '0.7s' }}>
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
