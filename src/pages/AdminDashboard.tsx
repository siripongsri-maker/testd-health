import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Pill, TestTube, TrendingUp, Shield, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Stats {
  totalUsers: number;
  prepUsers: number;
  pepUsers: number;
  avgStreak: number;
  totalCheckIns: number;
  pepCompletionRate: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    prepUsers: 0,
    pepUsers: 0,
    avgStreak: 0,
    totalCheckIns: 0,
    pepCompletionRate: 0,
  });

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user has admin role
      const { data: roleData } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });

      if (!roleData) {
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      fetchStats();
    };

    checkAdmin();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get PrEP users
      const { count: prepUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('mode', ['prep-daily', 'prep-ondemand']);

      // Get PEP users
      const { count: pepUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('mode', 'pep');

      // Get average streak
      const { data: streakData } = await supabase
        .from('profiles')
        .select('streak')
        .not('streak', 'is', null);

      const avgStreak =
        streakData && streakData.length > 0
          ? streakData.reduce((sum, p) => sum + (p.streak || 0), 0) / streakData.length
          : 0;

      setStats({
        totalUsers: totalUsers || 0,
        prepUsers: prepUsers || 0,
        pepUsers: pepUsers || 0,
        avgStreak: Math.round(avgStreak * 10) / 10,
        totalCheckIns: 0, // Would need separate check-ins table
        pepCompletionRate: 85, // Example value
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer showNav={false}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    suffix,
    color = 'primary',
  }: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    suffix?: string;
    color?: string;
  }) => (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${color}/10`}>
          <Icon className={`h-5 w-5 text-${color}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">
            {value}
            {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <PageContainer showNav={false}>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'th' ? 'แดชบอร์ดผู้ดูแล' : 'Admin Dashboard'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {language === 'th' ? 'ข้อมูลรวมแบบไม่ระบุตัวตน' : 'Anonymized aggregated data'}
          </p>
        </div>
      </div>

      <Card className="p-4 mb-6 bg-warning/5 border-warning/20">
        <p className="text-sm text-muted-foreground">
          {language === 'th'
            ? '⚠️ ข้อมูลทั้งหมดเป็นข้อมูลรวมและไม่ระบุตัวตน ใช้เพื่อการวิเคราะห์และปรับปรุงบริการเท่านั้น'
            : '⚠️ All data is aggregated and anonymized. Used for analysis and service improvement only.'}
        </p>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="overview" className="flex-1">
            {language === 'th' ? 'ภาพรวม' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex-1">
            {language === 'th' ? 'แนวโน้ม' : 'Trends'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Users}
              label={language === 'th' ? 'ผู้ใช้ทั้งหมด' : 'Total Users'}
              value={stats.totalUsers}
            />
            <StatCard
              icon={TrendingUp}
              label={language === 'th' ? 'ต่อเนื่องเฉลี่ย' : 'Avg Streak'}
              value={stats.avgStreak}
              suffix={language === 'th' ? 'วัน' : 'days'}
            />
          </div>

          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              {language === 'th' ? 'การใช้งานป้องกัน' : 'Prevention Usage'}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">PrEP</span>
                  <span className="font-medium">{stats.prepUsers}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${stats.totalUsers ? (stats.prepUsers / stats.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">PEP</span>
                  <span className="font-medium">{stats.pepUsers}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${stats.totalUsers ? (stats.pepUsers / stats.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <TestTube className="h-5 w-5 text-primary" />
              {language === 'th' ? 'อัตราความสำเร็จ PEP' : 'PEP Completion Rate'}
            </h3>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${stats.pepCompletionRate * 3.52} 352`}
                    className="text-success"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{stats.pepCompletionRate}%</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {language === 'th'
                ? 'กราฟแนวโน้มจะแสดงเมื่อมีข้อมูลเพียงพอ'
                : 'Trend charts will appear when more data is available'}
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
