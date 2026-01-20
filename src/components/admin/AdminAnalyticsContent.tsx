import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart3, Users, Eye, Smartphone, Monitor, Tablet, TrendingUp, Loader2, ClipboardList, Zap, Star } from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { useLanguage } from '@/lib/i18n';

interface DailyStats {
  date: string;
  visitors: number;
  pageviews: number;
}

interface PageStats {
  page_path: string;
  views: number;
}

interface DeviceStats {
  device_type: string;
  count: number;
}

interface SurveyStats {
  id: string;
  title_th: string;
  title_en: string;
  completion_count: number;
  view_count: number;
  xp_reward: number;
}

interface SurveyDailyStats {
  date: string;
  completions: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d'];

export default function AdminAnalyticsContent() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [pageStats, setPageStats] = useState<PageStats[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [totals, setTotals] = useState({
    visitors: 0,
    pageviews: 0,
    uniqueSessions: 0,
    avgSessionDuration: 0,
  });
  const [totalMembers, setTotalMembers] = useState(0);
  
  // Survey analytics state
  const [surveyStats, setSurveyStats] = useState<SurveyStats[]>([]);
  const [surveyDailyStats, setSurveyDailyStats] = useState<SurveyDailyStats[]>([]);
  const [surveyTotals, setSurveyTotals] = useState({
    totalSurveys: 0,
    totalCompletions: 0,
    totalXpAwarded: 0,
  });

  useEffect(() => {
    fetchAnalytics();
    fetchTotalMembers();
    fetchSurveyAnalytics();
  }, [dateRange]);

  const fetchTotalMembers = async () => {
    const { count, error } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true });

    if (!error && count !== null) {
      setTotalMembers(count);
    }
  };

  const fetchSurveyAnalytics = async () => {
    const days = parseInt(dateRange);
    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    // Fetch surveys with their stats
    const { data: surveys } = await supabase
      .from('surveys')
      .select('id, title_th, title_en, completion_count, view_count, xp_reward')
      .order('completion_count', { ascending: false });

    if (surveys) {
      setSurveyStats(surveys);
      setSurveyTotals({
        totalSurveys: surveys.length,
        totalCompletions: surveys.reduce((sum, s) => sum + s.completion_count, 0),
        totalXpAwarded: surveys.reduce((sum, s) => sum + (s.completion_count * s.xp_reward), 0),
      });
    }

    // Fetch daily completions
    const { data: completions } = await supabase
      .from('survey_completions')
      .select('completed_at, xp_awarded')
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString())
      .order('completed_at', { ascending: true });

    if (completions) {
      // Group by date
      const dailyMap = new Map<string, number>();
      
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        dailyMap.set(date, 0);
      }

      completions.forEach(completion => {
        const date = format(new Date(completion.completed_at), 'yyyy-MM-dd');
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
      });

      const dailyData: SurveyDailyStats[] = Array.from(dailyMap.entries()).map(([date, completions]) => ({
        date: format(new Date(date), 'MMM dd'),
        completions,
      }));

      setSurveyDailyStats(dailyData);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    const days = parseInt(dateRange);
    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
      return;
    }

    if (!events || events.length === 0) {
      setDailyStats([]);
      setPageStats([]);
      setDeviceStats([]);
      setTotals({ visitors: 0, pageviews: 0, uniqueSessions: 0, avgSessionDuration: 0 });
      setLoading(false);
      return;
    }

    // Calculate daily stats
    const dailyMap = new Map<string, { visitors: Set<string>; pageviews: number }>();
    
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      dailyMap.set(date, { visitors: new Set(), pageviews: 0 });
    }

    events.forEach(event => {
      const date = format(new Date(event.created_at), 'yyyy-MM-dd');
      const dayStats = dailyMap.get(date);
      if (dayStats) {
        if (event.session_id) dayStats.visitors.add(event.session_id);
        if (event.event_type === 'pageview') dayStats.pageviews++;
      }
    });

    const dailyData: DailyStats[] = Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date: format(new Date(date), 'MMM dd'),
      visitors: stats.visitors.size,
      pageviews: stats.pageviews,
    }));

    setDailyStats(dailyData);

    // Calculate page stats
    const pageMap = new Map<string, number>();
    events.forEach(event => {
      if (event.event_type === 'pageview' && event.page_path) {
        pageMap.set(event.page_path, (pageMap.get(event.page_path) || 0) + 1);
      }
    });

    const pageData: PageStats[] = Array.from(pageMap.entries())
      .map(([page_path, views]) => ({ page_path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    setPageStats(pageData);

    // Calculate device stats
    const deviceMap = new Map<string, number>();
    events.forEach(event => {
      const device = event.device_type || 'unknown';
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
    });

    const deviceData: DeviceStats[] = Array.from(deviceMap.entries())
      .map(([device_type, count]) => ({ device_type, count }));

    setDeviceStats(deviceData);

    // Calculate totals
    const uniqueSessions = new Set(events.map(e => e.session_id).filter(Boolean));
    
    setTotals({
      visitors: uniqueSessions.size,
      pageviews: events.filter(e => e.event_type === 'pageview').length,
      uniqueSessions: uniqueSessions.size,
      avgSessionDuration: 0,
    });

    setLoading(false);
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analytics Dashboard
        </h2>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">สมาชิก (Members)</p>
                <p className="text-2xl font-bold">
                  <AnimatedCounter value={totalMembers} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visitors</p>
                <p className="text-2xl font-bold">
                  <AnimatedCounter value={totals.visitors} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Eye className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pageviews</p>
                <p className="text-2xl font-bold">
                  <AnimatedCounter value={totals.pageviews} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="surveys">{language === 'th' ? 'แบบประเมิน' : 'Surveys'}</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="traffic">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Traffic Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="visitors" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Visitors"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pageviews" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--secondary))' }}
                      name="Pageviews"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available for this period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surveys">
          {/* Survey Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'th' ? 'แบบประเมินทั้งหมด' : 'Total Surveys'}
                    </p>
                    <p className="text-2xl font-bold">
                      <AnimatedCounter value={surveyTotals.totalSurveys} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <Users className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'th' ? 'ผู้ทำทั้งหมด' : 'Completions'}
                    </p>
                    <p className="text-2xl font-bold">
                      <AnimatedCounter value={surveyTotals.totalCompletions} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-xp/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-xp/20">
                    <Zap className="h-5 w-5 text-xp" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'th' ? 'XP ที่แจก' : 'XP Awarded'}
                    </p>
                    <p className="text-2xl font-bold">
                      <AnimatedCounter value={surveyTotals.totalXpAwarded} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Completions Over Time Chart */}
          <Card className="bg-card/50 backdrop-blur-sm mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {language === 'th' ? 'จำนวนผู้ทำแบบประเมินตามวัน' : 'Completions Over Time'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {surveyDailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={surveyDailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completions" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name={language === 'th' ? 'ผู้ทำ' : 'Completions'}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  {language === 'th' ? 'ไม่มีข้อมูลในช่วงนี้' : 'No data available for this period'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Surveys */}
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                {language === 'th' ? 'แบบประเมินยอดนิยม' : 'Top Surveys'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {surveyStats.length > 0 ? (
                <div className="space-y-3">
                  {surveyStats.slice(0, 10).map((survey, index) => (
                    <div key={survey.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-muted-foreground w-6">{index + 1}.</span>
                        <span className="font-medium truncate">
                          {language === 'th' ? survey.title_th : survey.title_en}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Users className="h-3.5 w-3.5" />
                          <span>{survey.completion_count}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xp text-sm font-medium">
                          <Zap className="h-3.5 w-3.5" />
                          <span>{survey.xp_reward} XP</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                  {language === 'th' ? 'ยังไม่มีแบบประเมิน' : 'No surveys available'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pageStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pageStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="page_path" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      width={100}
                      tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available for this period
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm mt-4">
            <CardHeader>
              <CardTitle>All Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pageStats.map((page, index) => (
                  <div key={page.page_path} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6">{index + 1}.</span>
                      <span className="font-mono text-sm">{page.page_path}</span>
                    </div>
                    <span className="font-semibold">{page.views}</span>
                  </div>
                ))}
                {pageStats.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No page data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Device Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deviceStats.length > 0 ? (
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={deviceStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="device_type"
                      >
                        {deviceStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-3 w-full md:w-auto">
                    {deviceStats.map((device, index) => (
                      <div key={device.device_type} className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device.device_type)}
                          <span className="capitalize">{device.device_type}</span>
                        </div>
                        <span className="ml-auto font-semibold">{device.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  No device data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
