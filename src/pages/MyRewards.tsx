import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Gift, Trophy, Star, Sparkles, Target, TrendingUp, Calendar, Award, Ticket, Crown, ChevronRight } from "lucide-react";
import { RewardsSummaryCard } from "@/components/rewards/RewardsSummaryCard";
import { PrizeDrawCard } from "@/components/rewards/PrizeDrawCard";
import { HowToEarnCard } from "@/components/rewards/HowToEarnCard";
import { MonthlyHistoryCard } from "@/components/rewards/MonthlyHistoryCard";

export default function MyRewards() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
        <BottomNav />
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <Gift className="h-16 w-16 text-primary/40" />
          <h2 className="text-xl font-bold">
            {language === 'th' ? 'เข้าสู่ระบบเพื่อดูรางวัล' : 'Sign in to view rewards'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {language === 'th' ? 'ลงทะเบียนหรือเข้าสู่ระบบเพื่อเริ่มสะสมคะแนนและลุ้นรางวัล' : 'Register or sign in to start earning points and enter prize draws'}
          </p>
          <Button onClick={() => navigate('/auth')}>
            {language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}
          </Button>
        </div>
        <BottomNav />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              {language === 'th' ? 'คะแนนสะสมของฉัน' : 'My Rewards'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {language === 'th' ? 'สะสมคะแนน ลุ้นรางวัลทุกเดือน' : 'Earn points, enter monthly draws'}
            </p>
          </div>
        </div>

        <RewardsSummaryCard userId={user.id} language={language} />
        <PrizeDrawCard userId={user.id} language={language} />
        <HowToEarnCard language={language} />
        <MonthlyHistoryCard userId={user.id} language={language} />
      </div>
      <BottomNav />
    </PageContainer>
  );
}
