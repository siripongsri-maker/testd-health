import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { getUserData } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  TestTube, 
  Pill, 
  User, 
  BookOpen, 
  MessageCircle, 
  ClipboardList,
  Award,
  Heart,
  ChevronRight,
  Sparkles,
  Calendar
} from 'lucide-react';

interface NextStep {
  id: string;
  icon: React.ElementType;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  path: string;
  priority: number;
  color: string;
  bgColor: string;
}

interface RecommendedNextStepsProps {
  maxItems?: number;
  variant?: 'compact' | 'full';
  onNavigate?: () => void;
}

export function RecommendedNextSteps({ 
  maxItems = 3, 
  variant = 'compact',
  onNavigate 
}: RecommendedNextStepsProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [steps, setSteps] = useState<NextStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateRecommendations();
  }, [user]);

  const generateRecommendations = async () => {
    setLoading(true);
    const userData = getUserData();
    const recommendations: NextStep[] = [];

    // Check various user states to generate personalized recommendations
    const hasMode = userData.mode && userData.mode !== 'exploring';
    const todayKey = new Date().toISOString().split('T')[0];
    const hasTodayCheckIn = userData.checkIns?.[todayKey];
    const hasCompletedProfile = userData.onboardingComplete;

    // 1. If no mode set, suggest setting up medication tracking
    if (!hasMode) {
      recommendations.push({
        id: 'setup-mode',
        icon: Pill,
        titleTh: 'ตั้งค่า PrEP/PEP',
        titleEn: 'Set Up PrEP/PEP',
        descTh: 'เริ่มติดตามการทานยาของคุณ',
        descEn: 'Start tracking your medication',
        path: '/medication-tracker',
        priority: 10,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      });
    }

    // 2. If has mode but hasn't checked in today
    if (hasMode && !hasTodayCheckIn) {
      recommendations.push({
        id: 'daily-checkin',
        icon: Sparkles,
        titleTh: 'เช็คอินวันนี้',
        titleEn: 'Daily Check-in',
        descTh: 'อย่าลืมทานยาและเก็บ streak!',
        descEn: "Don't forget your meds & keep your streak!",
        path: '/',
        priority: 9,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
      });
    }

    // 3. Check if user has ordered HIV test kit
    if (user) {
      const { data: hivRequests } = await supabase
        .from('hiv_selftest_requests')
        .select('id, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!hivRequests || hivRequests.length === 0) {
        recommendations.push({
          id: 'order-hiv-kit',
          icon: TestTube,
          titleTh: 'สั่งชุดตรวจ HIV ฟรี',
          titleEn: 'Order Free HIV Test Kit',
          descTh: 'ตรวจเองที่บ้าน ส่งฟรีทั่วไทย',
          descEn: 'Test at home, free delivery nationwide',
          path: '/hiv-selftest',
          priority: 8,
          color: 'text-pink-500',
          bgColor: 'bg-pink-500/10',
        });
      } else if (hivRequests[0].status === 'pending') {
        recommendations.push({
          id: 'track-order',
          icon: TestTube,
          titleTh: 'ติดตามชุดตรวจของคุณ',
          titleEn: 'Track Your Test Kit',
          descTh: 'ดูสถานะการจัดส่ง',
          descEn: 'Check delivery status',
          path: '/track-order',
          priority: 7,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
        });
      }

      // 4. Check personal info completion
      const { data: personalInfo } = await supabase
        .from('user_personal_info')
        .select('profile_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!personalInfo?.profile_completed) {
        recommendations.push({
          id: 'complete-profile',
          icon: User,
          titleTh: 'กรอกข้อมูลส่วนตัว',
          titleEn: 'Complete Your Profile',
          descTh: 'เพื่อรับคำแนะนำที่เหมาะกับคุณ',
          descEn: 'Get personalized recommendations',
          path: '/personal-info',
          priority: 6,
          color: 'text-violet-500',
          bgColor: 'bg-violet-500/10',
        });
      }

      // 5. Check survey completions
      const { data: surveys } = await supabase
        .from('surveys')
        .select('id')
        .eq('is_active', true)
        .limit(5);

      const { data: completions } = await supabase
        .from('survey_completions')
        .select('survey_id')
        .eq('user_id', user.id);

      const completedIds = new Set(completions?.map(c => c.survey_id) || []);
      const incompleteSurveys = surveys?.filter(s => !completedIds.has(s.id)) || [];

      if (incompleteSurveys.length > 0) {
        recommendations.push({
          id: 'take-survey',
          icon: ClipboardList,
          titleTh: 'ทำแบบสอบถาม',
          titleEn: 'Take a Survey',
          descTh: `มี ${incompleteSurveys.length} แบบสอบถามที่ยังไม่ได้ทำ`,
          descEn: `${incompleteSurveys.length} survey${incompleteSurveys.length > 1 ? 's' : ''} available`,
          path: '/surveys',
          priority: 5,
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
        });
      }
    } else {
      // Not logged in - suggest login or HIV test
      recommendations.push({
        id: 'order-hiv-kit',
        icon: TestTube,
        titleTh: 'สั่งชุดตรวจ HIV ฟรี',
        titleEn: 'Order Free HIV Test Kit',
        descTh: 'ตรวจเองที่บ้าน ส่งฟรีทั่วไทย',
        descEn: 'Test at home, free delivery nationwide',
        path: '/hiv-selftest',
        priority: 8,
        color: 'text-pink-500',
        bgColor: 'bg-pink-500/10',
      });
    }

    // 6. Always suggest reading articles
    recommendations.push({
      id: 'read-articles',
      icon: BookOpen,
      titleTh: 'อ่านบทความน่ารู้',
      titleEn: 'Read Health Articles',
      descTh: 'เรียนรู้เพิ่มเติมเกี่ยวกับสุขภาพ',
      descEn: 'Learn more about your health',
      path: '/info',
      priority: 3,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    });

    // 7. Suggest community
    recommendations.push({
      id: 'join-community',
      icon: MessageCircle,
      titleTh: 'พูดคุยในชุมชน',
      titleEn: 'Join the Community',
      descTh: 'แลกเปลี่ยนประสบการณ์กับคนอื่น',
      descEn: 'Share experiences with others',
      path: '/community',
      priority: 2,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    });

    // 8. Self-care
    recommendations.push({
      id: 'self-care',
      icon: Heart,
      titleTh: 'ดูแลตัวเอง',
      titleEn: 'Self Care',
      descTh: 'เครื่องมือดูแลสุขภาพกายและใจ',
      descEn: 'Tools for physical and mental health',
      path: '/self-care',
      priority: 1,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
    });

    // Sort by priority and take top items
    recommendations.sort((a, b) => b.priority - a.priority);
    setSteps(recommendations.slice(0, maxItems));
    setLoading(false);
  };

  const handleClick = (path: string) => {
    onNavigate?.();
    navigate(path);
  };

  if (loading || steps.length === 0) return null;

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {language === 'th' ? 'แนะนำสำหรับคุณ' : 'Recommended for You'}
        </h3>
        <div className="space-y-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => handleClick(step.path)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all group"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${step.bgColor} shrink-0`}>
                <step.icon className={`h-5 w-5 ${step.color}`} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {language === 'th' ? step.titleTh : step.titleEn}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {language === 'th' ? step.descTh : step.descEn}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          {language === 'th' ? 'ขั้นตอนถัดไปที่แนะนำ' : 'Recommended Next Steps'}
        </h3>
        <div className="grid gap-3">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => handleClick(step.path)}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:bg-muted/50 hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${step.bgColor} shrink-0`}>
                <step.icon className={`h-6 w-6 ${step.color}`} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-foreground">
                  {language === 'th' ? step.titleTh : step.titleEn}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'th' ? step.descTh : step.descEn}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
