import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import swingLogo from "@/assets/swing-logo.png";
import { MapPin, Clock, FileText, ExternalLink, Heart } from "lucide-react";

export default function Swing() {
  const { t } = useLanguage();

  const navigate = (await import("react-router-dom")).useNavigate ? undefined : undefined;
  const handleBookNow = () => {
    window.location.href = "/booking";
  };

  return (
    <>
      <PageContainer>
        <div className="mb-8 text-center">
          <img src={swingLogo} alt="SWING" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">{t('swing.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('swing.subtitle')}</p>
        </div>
        
        <div className="space-y-4 animate-slide-up">
          <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">{t('swing.whoCanAccess')}</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {t('swing.welcome')}</li>
                  <li>• {t('swing.noJudgment')}</li>
                  <li>• {t('swing.lgbtq')}</li>
                  <li>• {t('swing.confidential')}</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">{t('swing.whatToPrepare')}</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {t('swing.id')}</li>
                  <li>• {t('swing.medications')}</li>
                  <li>• {t('swing.questions')}</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10">
                <MapPin className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">{t('swing.locations')}</h3>
                <p className="text-sm text-muted-foreground mb-2">{t('swing.multipleLocations')}</p>
                <p className="text-sm text-foreground">{t('swing.visitWebsite')}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <Button variant="hero" onClick={handleBookNow} className="w-full gap-2">
            <ExternalLink className="h-5 w-5" />
            {t('swing.bookNow')}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4">{t('swing.opensNewWindow')}</p>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
