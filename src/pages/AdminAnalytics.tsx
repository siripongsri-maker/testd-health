import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart3, Users, Eye, Smartphone, Monitor, Tablet, TrendingUp, Clock } from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';

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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d'];

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
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

  useEffect(() => {
    checkAdminAndFetchData();
  }, [dateRange]);

  const checkAdminAndFetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Wait for auth to be determined - don't redirect immediately
    if (user === undefined) {
      return; // Still loading auth state
    }
    
    if (user === null) {
      navigate('/auth', { state: { from: '/admin/analytics' } });
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      navigate('/');
      return;
    }

    setIsAdmin(true);
    await fetchAnalytics();
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    const days = parseInt(dateRange);
    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    // Fetch all events in date range
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching analytics:', error);
      return;
    }

    if (!events || events.length === 0) {
      setDailyStats([]);
      setPageStats([]);
      setDeviceStats([]);
      setTotals({ visitors: 0, pageviews: 0, uniqueSessions: 0, avgSessionDuration: 0 });
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
    const uniqueUsers = new Set(events.map(e => e.user_id).filter(Boolean));
    
    setTotals({
      visitors: uniqueSessions.size,
      pageviews: events.filter(e => e.event_type === 'pageview').length,
      uniqueSessions: uniqueSessions.size,
      avgSessionDuration: 0, // Would need session start/end tracking
    });
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
      <PageContainer>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (!isAdmin) return null;

  return (
    <PageContainer>
      <AdminBreadcrumb currentPage="Analytics" />
      <PageHeader title="Analytics Dashboard" backTo="/admin" />
      
      <div className="space-y-6 pb-24">
        {/* Date Range Selector */}
        <div className="flex justify-end">
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
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Users className="h-5 w-5 text-primary" />
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

          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
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

            {/* Page list */}
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
    </PageContainer>
  );
};

export default AdminAnalytics;
