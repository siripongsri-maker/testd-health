import { Button } from "@/components/ui/button";
import { Heart, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center safe-top">
        {/* Logo & Icon */}
        <div className="mb-8 animate-bounce-gentle">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full gradient-primary shadow-soft">
            <Shield className="h-12 w-12 text-primary-foreground" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground">
          test<span className="text-primary">D</span>
        </h1>
        
        {/* Tagline */}
        <p className="mb-2 text-xl font-semibold text-foreground">
          Your sexual health companion
        </p>
        
        {/* Description */}
        <p className="mb-12 max-w-xs text-muted-foreground leading-relaxed">
          Track, learn, and stay on prevention — your way. Private, supportive, and judgment-free.
        </p>
        
        {/* Action Buttons */}
        <div className="w-full max-w-xs space-y-4">
          <Button asChild variant="hero" className="w-full">
            <Link to="/onboarding" className="gap-3">
              Start anonymously
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          
          <Button asChild variant="hero-outline" className="w-full">
            <Link to="/onboarding" className="gap-3">
              <Heart className="h-5 w-5 text-accent" />
              Login with email
            </Link>
          </Button>
        </div>
        
        {/* Trust indicators */}
        <div className="mt-12 flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success" />
            Anonymous
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Secure
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent" />
            Free
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-6 pb-8 text-center text-xs text-muted-foreground safe-bottom">
        <p>testD is a health support tool, not medical advice.</p>
        <p className="mt-1">Always consult healthcare providers.</p>
      </div>
    </div>
  );
}
