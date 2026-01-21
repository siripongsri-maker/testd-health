import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n';
import { useOnboardingTour, tourSteps } from '@/hooks/useOnboardingTour';
import { X, ChevronLeft, ChevronRight, Sparkles, Pill, TestTube, Users, Trophy, Rocket } from 'lucide-react';

const stepIcons = [Sparkles, Pill, TestTube, Users, Trophy, Rocket];

interface OnboardingTourProps {
  onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const { language } = useLanguage();
  const {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    hasCompleted,
    startTour,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboardingTour();

  // Auto-start tour for first-time users
  useEffect(() => {
    if (!hasCompleted) {
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompleted]);

  // Call onComplete when tour finishes
  useEffect(() => {
    if (hasCompleted && onComplete) {
      onComplete();
    }
  }, [hasCompleted, onComplete]);

  if (!isActive) return null;

  const StepIcon = stepIcons[currentStep] || Sparkles;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const stepColors = [
    'from-primary to-primary/80',
    'from-blue-500 to-blue-600',
    'from-pink-500 to-rose-500',
    'from-green-500 to-emerald-500',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-purple-500',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={skipTour}
      />
      
      {/* Tour Card */}
      <Card className="relative z-10 w-full max-w-sm border-0 shadow-2xl animate-scale-in overflow-hidden">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${stepColors[currentStep]} p-6 text-white`}>
          {/* Skip button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
            onClick={skipTour}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <StepIcon className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center">
            {language === 'th' ? currentStepData.titleTh : currentStepData.titleEn}
          </h2>
        </div>

        <CardContent className="p-6">
          {/* Description */}
          <p className="text-center text-muted-foreground mb-6 leading-relaxed">
            {language === 'th' ? currentStepData.descriptionTh : currentStepData.descriptionEn}
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-6 bg-primary' 
                    : index < currentStep 
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {!isFirstStep && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1 rounded-xl h-12"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {language === 'th' ? 'ก่อนหน้า' : 'Back'}
              </Button>
            )}
            
            <Button
              onClick={nextStep}
              className={`flex-1 rounded-xl h-12 ${isFirstStep ? 'w-full' : ''}`}
            >
              {isLastStep ? (
                <>
                  {language === 'th' ? 'เริ่มใช้งาน' : 'Get Started'}
                  <Rocket className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  {language === 'th' ? 'ถัดไป' : 'Next'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* Skip text */}
          {!isLastStep && (
            <button
              onClick={skipTour}
              className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {language === 'th' ? 'ข้ามการแนะนำ' : 'Skip tour'}
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export a button component to restart the tour
export function RestartTourButton() {
  const { language } = useLanguage();
  const { resetTour, startTour, hasCompleted } = useOnboardingTour();

  const handleClick = () => {
    resetTour();
    setTimeout(() => startTour(), 100);
  };

  if (!hasCompleted) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="gap-2"
    >
      <Sparkles className="h-4 w-4" />
      {language === 'th' ? 'ดูแนะนำอีกครั้ง' : 'View Tour Again'}
    </Button>
  );
}
