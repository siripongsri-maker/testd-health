import { useState, useEffect } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, Star, Clock, Calendar, Repeat, Zap, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuestProgress } from "@/hooks/useQuestProgress";
import { toast } from "sonner";

interface Quest {
  id: string;
  slug: string;
  title_en: string;
  title_th: string;
  description_en: string;
  description_th: string;
  quest_type: string;
  target_count: number;
  reward_xp: number;
  trigger_type: string | null;
}

interface UserQuest {
  quest_id: string;
  progress: number;
  completed: boolean;
  last_reset_at: string | null;
}

// Get start of day in Asia/Bangkok timezone
const getBangkokDayStart = (): Date => {
  const now = new Date();
  const bangkokOffset = 7 * 60 * 60 * 1000;
  const bangkokNow = new Date(now.getTime() + bangkokOffset);
  const dayStart = new Date(bangkokNow.getFullYear(), bangkokNow.getMonth(), bangkokNow.getDate());
  return new Date(dayStart.getTime() - bangkokOffset);
};

// Get start of month in Asia/Bangkok timezone  
const getBangkokMonthStart = (): Date => {
  const now = new Date();
  const bangkokOffset = 7 * 60 * 60 * 1000;
  const bangkokNow = new Date(now.getTime() + bangkokOffset);
  const monthStart = new Date(bangkokNow.getFullYear(), bangkokNow.getMonth(), 1);
  return new Date(monthStart.getTime() - bangkokOffset);
};

// Check if quest progress should be shown as reset
const isQuestReset = (questType: string, lastResetAt: string | null, completed: boolean): boolean => {
  if (!completed || !lastResetAt) return false;
  
  const lastReset = new Date(lastResetAt);
  
  if (questType === 'daily') {
    return lastReset < getBangkokDayStart();
  }
  
  if (questType === 'monthly') {
    return lastReset < getBangkokMonthStart();
  }
  
  return false;
};

export default function Quests() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { trackSocialVisit } = useQuestProgress();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [userQuests, setUserQuests] = useState<Record<string, UserQuest>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuests();
  }, [user]);

  const fetchQuests = async () => {
    const { data: questsData } = await supabase
      .from('quests')
      .select('id, slug, title_en, title_th, description_en, description_th, quest_type, target_count, reward_xp, trigger_type')
      .eq('is_active', true);

    if (questsData) {
      setQuests(questsData as Quest[]);
    }

    if (user) {
      const { data: userQuestsData } = await supabase
        .from('user_quests')
        .select('quest_id, progress, completed, last_reset_at')
        .eq('user_id', user.id);

      if (userQuestsData) {
        const questMap: Record<string, UserQuest> = {};
        userQuestsData.forEach((uq) => {
          questMap[uq.quest_id] = uq as UserQuest;
        });
        setUserQuests(questMap);
      }
    }

    setLoading(false);
  };

  const oneTimeQuests = quests.filter((q) => q.quest_type === 'one-time');
  const dailyQuests = quests.filter((q) => q.quest_type === 'daily');
  const monthlyQuests = quests.filter((q) => q.quest_type === 'monthly');

  const handleSocialVisit = async () => {
    // Open SWING social media
    window.open('https://www.facebook.com/swaboratory', '_blank');
    // Track the quest
    await trackSocialVisit(language);
  };

  const getEffectiveProgress = (quest: Quest, userQuest: UserQuest | undefined) => {
    if (!userQuest) return { progress: 0, completed: false };
    
    // Check if needs visual reset
    if (isQuestReset(quest.quest_type, userQuest.last_reset_at, userQuest.completed)) {
      return { progress: 0, completed: false };
    }
    
    return { progress: userQuest.progress, completed: userQuest.completed };
  };

  const QuestCard = ({ quest }: { quest: Quest }) => {
    const userQuest = userQuests[quest.id];
    const { progress, completed: isCompleted } = getEffectiveProgress(quest, userQuest);
    const progressPercent = Math.min((progress / quest.target_count) * 100, 100);
    const isSocialQuest = quest.trigger_type === 'social_visit';

    const getQuestTypeIcon = () => {
      switch (quest.quest_type) {
        case 'daily':
          return <Repeat className="h-5 w-5" />;
        case 'monthly':
          return <Calendar className="h-5 w-5" />;
        default:
          return <Target className="h-5 w-5" />;
      }
    };

    const getQuestTypeLabel = () => {
      switch (quest.quest_type) {
        case 'daily':
          return language === 'th' ? 'รีเซ็ตทุกวัน' : 'Resets daily';
        case 'monthly':
          return language === 'th' ? 'รีเซ็ตทุกเดือน' : 'Resets monthly';
        default:
          return language === 'th' ? 'ครั้งเดียว' : 'One-time';
      }
    };

    return (
      <Card className={`p-4 ${isCompleted ? 'bg-success/5 border-success/30' : ''}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            isCompleted ? 'bg-success/20 text-success' : 'bg-primary/10 text-primary'
          }`}>
            {isCompleted ? <Star className="h-6 w-6" /> : getQuestTypeIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-foreground">
                {language === 'th' ? quest.title_th : quest.title_en}
              </h3>
              <div className="flex items-center gap-1 text-xp font-bold text-sm shrink-0">
                <Zap className="h-4 w-4" />
                +{quest.reward_xp}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">
              {language === 'th' ? quest.description_th : quest.description_en}
            </p>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <Clock className="h-3 w-3" />
              <span>{getQuestTypeLabel()}</span>
            </div>

            {isCompleted ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                  ✓ {language === 'th' ? 'สำเร็จแล้ว' : 'Completed'}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {progress} / {quest.target_count}
                  </span>
                  <span className="font-medium text-primary">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                
                {/* Special button for social visit quest */}
                {isSocialQuest && !isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSocialVisit}
                    className="mt-2 gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {language === 'th' ? 'เปิด SWING' : 'Visit SWING'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const EmptyState = ({ type }: { type: string }) => {
    const icons = {
      'one-time': Target,
      'daily': Repeat,
      'monthly': Calendar,
    };
    const Icon = icons[type as keyof typeof icons] || Target;
    
    return (
      <Card className="p-8 text-center">
        <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          {language === 'th' ? 'ยังไม่มีเควสในหมวดนี้' : 'No quests in this category'}
        </p>
      </Card>
    );
  };

  // Calculate stats
  const totalQuests = quests.length;
  const completedCount = quests.filter(q => {
    const uq = userQuests[q.id];
    return uq && getEffectiveProgress(q, uq).completed;
  }).length;

  if (loading) {
    return (
      <>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <PageContainer>
        <PageHeader 
          title={language === 'th' ? 'เควส' : 'Quests'} 
          subtitle={language === 'th' ? 'ทำภารกิจรับ XP' : 'Complete tasks to earn XP'} 
          rightContent={<Trophy className="h-6 w-6 text-primary" />}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{completedCount}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'th' ? 'สำเร็จแล้ว' : 'Completed'}
              </p>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{totalQuests}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'th' ? 'เควสทั้งหมด' : 'Total Quests'}
              </p>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="one-time" className="w-full">
          <TabsList className="w-full mb-4 grid grid-cols-3">
            <TabsTrigger value="one-time" className="text-xs sm:text-sm">
              {language === 'th' ? 'ครั้งเดียว' : 'One-time'}
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-xs sm:text-sm">
              {language === 'th' ? 'รายวัน' : 'Daily'}
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs sm:text-sm">
              {language === 'th' ? 'รายเดือน' : 'Monthly'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="one-time" className="space-y-3">
            {oneTimeQuests.length === 0 ? (
              <EmptyState type="one-time" />
            ) : (
              oneTimeQuests.map((quest) => <QuestCard key={quest.id} quest={quest} />)
            )}
          </TabsContent>

          <TabsContent value="daily" className="space-y-3">
            {dailyQuests.length === 0 ? (
              <EmptyState type="daily" />
            ) : (
              dailyQuests.map((quest) => <QuestCard key={quest.id} quest={quest} />)
            )}
          </TabsContent>

          <TabsContent value="monthly" className="space-y-3">
            {monthlyQuests.length === 0 ? (
              <EmptyState type="monthly" />
            ) : (
              monthlyQuests.map((quest) => <QuestCard key={quest.id} quest={quest} />)
            )}
          </TabsContent>
        </Tabs>

        {/* Login prompt for guests */}
        {!user && (
          <Card className="mt-6 p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">
                  {language === 'th' ? 'เข้าสู่ระบบเพื่อบันทึกความคืบหน้า' : 'Login to save your progress'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'ทำเควสและรับ XP ได้เลย!' : 'Complete quests and earn XP!'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
