import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { LanguageToggle } from "@/components/LanguageToggle";
import { setUserData, addBadge } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { Pill, Clock, Search, ArrowRight, ChevronRight } from "lucide-react";

type Mode = "prep-daily" | "prep-ondemand" | "pep" | "exploring";

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const steps = [
    {
      question: t('onboarding.q1'),
      subtitle: t('onboarding.q1.subtitle'),
      options: [
        { value: "prep", label: t('onboarding.prep'), icon: Pill, description: t('onboarding.prep.desc') },
        { value: "pep", label: t('onboarding.pep'), icon: Clock, description: t('onboarding.pep.desc') },
        { value: "exploring", label: t('onboarding.exploring'), icon: Search, description: t('onboarding.exploring.desc') },
      ],
    },
    {
      question: t('onboarding.q2'),
      subtitle: t('onboarding.q1.subtitle'),
      condition: (ans: Record<string, string>) => ans.step1 === "prep",
      options: [
        { value: "prep-daily", label: t('onboarding.daily'), icon: Pill, description: t('onboarding.daily.desc') },
        { value: "prep-ondemand", label: t('onboarding.ondemand'), icon: Clock, description: t('onboarding.ondemand.desc') },
      ],
    },
  ];

  const getActiveSteps = () => {
    return steps.filter((step, index) => {
      if (!step.condition) return true;
      if (index === 0) return true;
      return step.condition(answers);
    });
  };

  const activeSteps = getActiveSteps();
  const currentStepData = activeSteps[currentStep];
  const totalSteps = activeSteps.length + 1;

  const handleSelect = (value: string) => {
    const newAnswers = { ...answers, [`step${currentStep + 1}`]: value };
    setAnswers(newAnswers);

    let mode: Mode = "exploring";
    if (value === "pep") {
      mode = "pep";
    } else if (value === "prep-daily") {
      mode = "prep-daily";
    } else if (value === "prep-ondemand") {
      mode = "prep-ondemand";
    } else if (newAnswers.step1 === "exploring") {
      mode = "exploring";
    }

    const nextStep = currentStep + 1;
    const nextStepData = steps[nextStep];
    
    if (nextStepData && nextStepData.condition && !nextStepData.condition(newAnswers)) {
      saveAndNavigate(mode);
    } else if (nextStep < activeSteps.length) {
      setCurrentStep(nextStep);
    } else {
      saveAndNavigate(mode);
    }
  };

  const saveAndNavigate = (mode: Mode) => {
    setUserData({ mode });
    
    if (mode.startsWith("prep")) {
      addBadge("Started PrEP Journey");
    } else if (mode === "pep") {
      addBadge("PEP Warrior");
    }
    
    navigate("/consent");
  };

  const handleSkip = () => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveAndNavigate("exploring");
    }
  };

  if (!currentStepData) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col px-6 py-8 safe-top safe-bottom">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      {/* Progress */}
      <ProgressIndicator current={currentStep + 1} total={totalSteps} className="mb-8" />
      
      {/* Question */}
      <div className="mb-8 animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {currentStepData.question}
        </h1>
        <p className="text-muted-foreground">
          {currentStepData.subtitle}
        </p>
      </div>
      
      {/* Options */}
      <div className="flex-1 space-y-4">
        {currentStepData.options.map((option, index) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-soft active:scale-[0.98] animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-lg text-foreground">{option.label}</h3>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
      
      {/* Skip button */}
      <div className="mt-8">
        <Button variant="ghost" onClick={handleSkip} className="w-full text-muted-foreground">
          {t('onboarding.skip')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
