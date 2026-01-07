import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import swingLogo from "@/assets/swing-logo.webp";
import { MapPin, Clock, FileText, ExternalLink, Heart } from "lucide-react";

export default function Swing() {
  const handleBookNow = () => {
    window.open("https://swingthailand.org", "_blank");
  };

  return (
    <>
      <PageContainer>
        {/* Header with Logo */}
        <div className="mb-8 text-center">
          <img
            src={swingLogo}
            alt="SWING"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Get Free PrEP at SWING</h1>
          <p className="text-muted-foreground mt-2">
            Friendly, judgment-free sexual health services
          </p>
        </div>
        
        {/* Info Cards */}
        <div className="space-y-4 animate-slide-up">
          {/* Who Can Access */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">Who Can Access</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Everyone is welcome</li>
                  <li>• No judgment, no questions</li>
                  <li>• LGBTQ+ friendly services</li>
                  <li>• Confidential and safe</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* What to Prepare */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">What to Prepare</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• ID (optional but helpful)</li>
                  <li>• List of current medications</li>
                  <li>• Your questions (we're here to help!)</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Locations */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10">
                <MapPin className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">Locations</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Multiple locations across Thailand
                </p>
                <p className="text-sm text-foreground">
                  Visit the website for nearest clinic
                </p>
              </div>
            </div>
          </div>
          
          {/* Hours */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">Opening Hours</h3>
                <p className="text-sm text-muted-foreground">
                  Check website for current hours
                </p>
                <p className="text-sm text-foreground mt-1">
                  Walk-ins welcome, appointments recommended
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA */}
        <div className="mt-8">
          <Button variant="hero" onClick={handleBookNow} className="w-full gap-2">
            <ExternalLink className="h-5 w-5" />
            Book Now
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Opens in a new window
          </p>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
