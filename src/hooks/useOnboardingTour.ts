import { useState, useEffect } from 'react';

const TOUR_STORAGE_KEY = 'testd_onboarding_tour_completed';

export interface TourStep {
  id: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    titleTh: 'ยินดีต้อนรับสู่ testD! 🎉',
    titleEn: 'Welcome to testD! 🎉',
    descriptionTh: 'มาดูฟีเจอร์หลักๆ ที่จะช่วยดูแลสุขภาพของคุณกันเถอะ',
    descriptionEn: "Let's explore the key features that will help you take care of your health",
    position: 'center',
  },
  {
    id: 'medication',
    titleTh: 'ติดตามการทานยา 💊',
    titleEn: 'Medication Tracking 💊',
    descriptionTh: 'ติดตาม PrEP หรือ PEP ของคุณ รับการเตือน และรักษา streak ของคุณ',
    descriptionEn: 'Track your PrEP or PEP, get reminders, and maintain your streak',
    position: 'center',
  },
  {
    id: 'hiv-test',
    titleTh: 'ตรวจ HIV ฟรี 🧪',
    titleEn: 'Free HIV Testing 🧪',
    descriptionTh: 'สั่งชุดตรวจ HIV ส่งถึงบ้าน ไม่เสียค่าใช้จ่ายและเป็นความลับ',
    descriptionEn: 'Order free HIV self-test kits delivered to your door, confidentially',
    position: 'center',
  },
  {
    id: 'community',
    titleTh: 'ชุมชนที่ปลอดภัย 👥',
    titleEn: 'Safe Community 👥',
    descriptionTh: 'พูดคุยกับผู้อื่นโดยไม่เปิดเผยตัวตน รับความช่วยเหลือและกำลังใจ',
    descriptionEn: 'Chat anonymously with others, get support and encouragement',
    position: 'center',
  },
  {
    id: 'rewards',
    titleTh: 'รับรางวัลและ XP 🏆',
    titleEn: 'Earn Rewards & XP 🏆',
    descriptionTh: 'ทำภารกิจ รับ XP เลื่อนเลเวล และปลดล็อคเหรียญตรา',
    descriptionEn: 'Complete quests, earn XP, level up, and unlock badges',
    position: 'center',
  },
  {
    id: 'done',
    titleTh: 'พร้อมเริ่มต้นแล้ว! 🚀',
    titleEn: "You're all set! 🚀",
    descriptionTh: 'มาเริ่มดูแลสุขภาพของคุณไปด้วยกันนะ!',
    descriptionEn: "Let's start taking care of your health together!",
    position: 'center',
  },
];

export function useOnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      setHasCompleted(false);
    }
  }, []);

  const startTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipTour = () => {
    completeTour();
  };

  const completeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsActive(false);
    setHasCompleted(true);
  };

  const resetTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setHasCompleted(false);
  };

  return {
    isActive,
    currentStep,
    totalSteps: tourSteps.length,
    currentStepData: tourSteps[currentStep],
    hasCompleted,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    resetTour,
  };
}
