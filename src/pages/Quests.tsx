import { useState, useEffect } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Target, Star, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, differenceInDays, isWithinInterval } from "date-fns";

interface Quest {
  id: string;
  slug: string;
  title_en: string;
  title_th: string;
  description_en: string;
  description_th: string;
  quest_type: string;
  target_days: number;
  badge_id: string;
  start_date: string | null;
  end_date: string | null;
}

interface UserQuest {
  quest_id: string;
  progress: number;
  completed: boolean;
}

export default function Quests() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [userQuests, setUserQuests] = useState<Record<string, UserQuest>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuests = async () => {
      const { data: questsData } = await supabase
        .from('quests')
        .select('*')
        .eq('is_active', true);

      if (questsData) {
        setQuests(questsData);
      }

      if (user) {
        const { data: userQuestsData } = await supabase
          .from('user_quests')
          .select('quest_id, progress, completed')
          .eq('user_id', user.id);

        if (userQuestsData) {
          const questMap: Record<string, UserQuest> = {};
          userQuestsData.forEach((uq) => {
            questMap[uq.quest_id] = uq;
          });
          setUserQuests(questMap);
        }
      }

      setLoading(false);
    };

    fetchQuests();
  }, [user]);

  const journeyQuests = quests.filter((q) => q.quest_type === 'journey');
  const campaignQuests = quests.filter((q) => {
    if (q.quest_type !== 'campaign') return false;
    if (!q.start_date || !q.end_date) return true;
    const now = new Date();
    return isWithinInterval(now, {
      start: new Date(q.start_date),
      end: new Date(q.end_date),
    });
  });

  const joinQuest = async (questId: string) => {
    if (!user) {
      toast.error(t('quests.loginRequired'));
      return;
    }

    try {
      await supabase.from('user_quests').insert({
        user_id: user.id,
        quest_id: questId,
        progress: 0,
        completed: false,
      });

      setUserQuests((prev) => ({
        ...prev,
        [questId]: { quest_id: questId, progress: 0, completed: false },
      }));

      toast.success(t('quests.joined'));
    } catch (error) {
      console.error('Error joining quest:', error);
      toast.error(t('common.error'));
    }
  };

  const QuestCard = ({ quest }: { quest: Quest }) => {
    const userQuest = userQuests[quest.id];
    const isJoined = !!userQuest;
    const progressPercent = userQuest
      ? Math.min((userQuest.progress / quest.target_days) * 100, 100)
      : 0;
    const isCompleted = userQuest?.completed;

    const daysRemaining = quest.end_date
      ? differenceInDays(new Date(quest.end_date), new Date())
      : null;

    return (
      <Card className={`p-4 ${isCompleted ? 'bg-success/5 border-success/30' : ''}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            isCompleted ? 'bg-success/20' : 'bg-primary/10'
          }`}>
            {isCompleted ? (
              <Star className="h-6 w-6 text-success" />
            ) : quest.quest_type === 'campaign' ? (
              <Calendar className="h-6 w-6 text-primary" />
            ) : (
              <Target className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-foreground">
                {language === 'th' ? quest.title_th : quest.title_en}
              </h3>
              {isCompleted && (
                <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                  {t('quests.completed')}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {language === 'th' ? quest.description_th : quest.description_en}
            </p>

            {daysRemaining !== null && daysRemaining > 0 && (
              <div className="flex items-center gap-1 text-xs text-accent mb-2">
                <Clock className="h-3 w-3" />
                <span>{daysRemaining} {t('quests.daysLeft')}</span>
              </div>
            )}

            {isJoined ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {userQuest.progress} / {quest.target_days} {t('quests.days')}
                  </span>
                  <span className="font-medium text-primary">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {!isCompleted && progressPercent > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {progressPercent < 50
                      ? t('quests.keepGoing')
                      : progressPercent < 100
                      ? t('quests.almostThere')
                      : t('quests.claimBadge')}
                  </p>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => joinQuest(quest.id)}
                className="mt-2"
              >
                {t('quests.join')}
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

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
          title={t('quests.title')} 
          subtitle={t('quests.subtitle')} 
          rightContent={<Trophy className="h-6 w-6 text-primary" />}
        />

        <Tabs defaultValue="journey" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="journey" className="flex-1">{t('quests.journey')}</TabsTrigger>
            <TabsTrigger value="campaign" className="flex-1">{t('quests.campaign')}</TabsTrigger>
          </TabsList>

          <TabsContent value="journey" className="space-y-3">
            {journeyQuests.length === 0 ? (
              <Card className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t('quests.noJourneyQuests')}</p>
              </Card>
            ) : (
              journeyQuests.map((quest) => <QuestCard key={quest.id} quest={quest} />)
            )}
          </TabsContent>

          <TabsContent value="campaign" className="space-y-3">
            {campaignQuests.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t('quests.noCampaignQuests')}</p>
              </Card>
            ) : (
              campaignQuests.map((quest) => <QuestCard key={quest.id} quest={quest} />)
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
      <BottomNav />
    </>
  );
}
