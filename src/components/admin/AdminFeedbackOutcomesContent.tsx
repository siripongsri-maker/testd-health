import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Star, Heart, Brain, Shield, TrendingUp, Repeat, Eye, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface FeedbackRow {
  id: string;
  unique_id: string;
  service_date: string;
  channel: string;
  branch_id: string | null;
  counselling_quality_percent: number | null;
  satisfaction_score: number | null;
  self_efficacy_score: number | null;
  received_sti: boolean;
  received_prep: boolean;
  received_pep: boolean;
  received_art: boolean;
  received_harm_reduction: boolean;
  received_mental_health: boolean;
  sti_knowledge_score: number | null;
  prep_knowledge_score: number | null;
  pep_knowledge_score: number | null;
  art_knowledge_score: number | null;
  hr_knowledge_score: number | null;
  mh_outcome: string | null;
  mh_referral_uptake: string | null;
  hr_intention_count: number | null;
  is_anonymous: boolean;
  status: string;
  open_feedback_text: string | null;
  submitted_at: string;
  uic_hnid: string | null;
  client_seed_id: string | null;
  visit_count_before: number | null;
  assessment_count_before: number | null;
  is_repeat_assessment: boolean | null;
  last_assessment_at: string | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

export default function AdminFeedbackOutcomesContent() {
  const { language } = useLanguage();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [repeatFilter, setRepeatFilter] = useState<'all' | 'first' | 'repeat'>('all');
  const [uicSearch, setUicSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    let q = supabase.from('client_feedback_responses').select('*').eq('status', 'submitted').order('service_date', { ascending: false }).limit(1000);
    if (dateFrom) q = q.gte('service_date', dateFrom);
    if (dateTo) q = q.lte('service_date', dateTo);
    if (channelFilter) q = q.eq('channel', channelFilter);
    const { data } = await q;
    setRows((data as any[]) || []);
    setLoading(false);
  };

  const avg = (arr: (number | null)[]): number => {
    const valid = arr.filter(v => v != null) as number[];
    return valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : 0;
  };

  // Apply client-side filters (repeat + UIC search)
  const filteredRows = rows.filter(r => {
    if (repeatFilter === 'first' && r.is_repeat_assessment) return false;
    if (repeatFilter === 'repeat' && !r.is_repeat_assessment) return false;
    if (uicSearch.trim() && !(r.uic_hnid || '').includes(uicSearch.trim())) return false;
    return true;
  });

  const totalResponses = filteredRows.length;
  const avgQuality = avg(filteredRows.map(r => r.counselling_quality_percent));
  const avgSatisfaction = avg(filteredRows.map(r => r.satisfaction_score));
  const avgEfficacy = avg(filteredRows.map(r => r.self_efficacy_score));
  const mhImproved = filteredRows.filter(r => r.mh_outcome === 'much_better' || r.mh_outcome === 'slightly_better').length;
  const mhTotal = filteredRows.filter(r => r.received_mental_health).length;
  const hrPositive = filteredRows.filter(r => (r.hr_intention_count || 0) > 0 && r.received_harm_reduction).length;
  const hrTotal = filteredRows.filter(r => r.received_harm_reduction).length;

  // Repeat / UIC metrics
  const withUic = filteredRows.filter(r => r.uic_hnid).length;
  const repeatCount = filteredRows.filter(r => r.is_repeat_assessment).length;
  const firstTimeCount = filteredRows.filter(r => r.uic_hnid && !r.is_repeat_assessment).length;
  const uniqueUics = new Set(filteredRows.filter(r => r.uic_hnid).map(r => r.uic_hnid)).size;
  const visitsBefore = filteredRows.filter(r => r.visit_count_before != null).map(r => r.visit_count_before as number);
  const avgVisitsBefore = visitsBefore.length ? Math.round((visitsBefore.reduce((a, b) => a + b, 0) / visitsBefore.length) * 10) / 10 : 0;

  // Channel breakdown
  const channelData = ['clinic', 'outreach', 'online'].map(ch => ({
    name: ch,
    count: rows.filter(r => r.channel === ch).length,
  }));

  // Monthly trend
  const monthMap = new Map<string, { count: number; satSum: number; qualSum: number; satN: number; qualN: number }>();
  rows.forEach(r => {
    const m = r.service_date?.slice(0, 7) || 'unknown';
    const e = monthMap.get(m) || { count: 0, satSum: 0, qualSum: 0, satN: 0, qualN: 0 };
    e.count++;
    if (r.satisfaction_score != null) { e.satSum += r.satisfaction_score; e.satN++; }
    if (r.counselling_quality_percent != null) { e.qualSum += r.counselling_quality_percent; e.qualN++; }
    monthMap.set(m, e);
  });
  const trendData = Array.from(monthMap.entries()).sort().map(([m, e]) => ({
    month: m,
    responses: e.count,
    avgSatisfaction: e.satN ? Math.round(e.satSum / e.satN * 10) / 10 : 0,
    avgQuality: e.qualN ? Math.round(e.qualSum / e.qualN * 10) / 10 : 0,
  }));

  // Knowledge scores
  const knowledgeData = [
    { name: 'STI', score: avg(rows.filter(r => r.received_sti).map(r => r.sti_knowledge_score)), max: 3 },
    { name: 'PrEP', score: avg(rows.filter(r => r.received_prep).map(r => r.prep_knowledge_score)), max: 3 },
    { name: 'PEP', score: avg(rows.filter(r => r.received_pep).map(r => r.pep_knowledge_score)), max: 3 },
    { name: 'ART', score: avg(rows.filter(r => r.received_art).map(r => r.art_knowledge_score)), max: 3 },
    { name: 'HR', score: avg(rows.filter(r => r.received_harm_reduction).map(r => r.hr_knowledge_score)), max: 3 },
  ];

  const exportCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['unique_id','service_date','channel','satisfaction','self_efficacy','quality_pct','mh_outcome','is_anonymous'];
    const csv = BOM + headers.join(',') + '\n' + rows.map(r =>
      [r.unique_id, r.service_date, r.channel, r.satisfaction_score, r.self_efficacy_score, r.counselling_quality_percent, r.mh_outcome || '', r.is_anonymous].join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `feedback_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">
          {language === 'th' ? '📊 Feedback & Outcomes' : '📊 Feedback & Outcomes'}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" placeholder="From" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" placeholder="To" />
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">{language === 'th' ? 'ทุกช่องทาง' : 'All Channels'}</option>
            <option value="clinic">Clinic</option>
            <option value="outreach">Outreach</option>
            <option value="online">Online</option>
          </select>
          <Button size="sm" onClick={fetchData}>🔄</Button>
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SummaryCard icon={<TrendingUp />} label={language === 'th' ? 'ตอบทั้งหมด' : 'Responses'} value={totalResponses} />
        <SummaryCard icon={<Star />} label={language === 'th' ? 'คุณภาพ %' : 'Quality %'} value={`${avgQuality}%`} />
        <SummaryCard icon={<Heart />} label={language === 'th' ? 'ความพึงพอใจ' : 'Satisfaction'} value={`${avgSatisfaction}/5`} />
        <SummaryCard icon={<Shield />} label={language === 'th' ? 'Self-Efficacy' : 'Self-Efficacy'} value={`${avgEfficacy}/5`} />
        <SummaryCard icon={<Brain />} label={language === 'th' ? 'MH ดีขึ้น' : 'MH Improved'} value={mhTotal ? `${Math.round(mhImproved / mhTotal * 100)}%` : 'N/A'} />
        <SummaryCard icon={<Heart />} label={language === 'th' ? 'HR ตั้งใจเปลี่ยน' : 'HR Positive'} value={hrTotal ? `${Math.round(hrPositive / hrTotal * 100)}%` : 'N/A'} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Trend */}
        <Card>
          <CardHeader><CardTitle className="text-sm">{language === 'th' ? 'แนวโน้มรายเดือน' : 'Monthly Trend'}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="responses" stroke="hsl(var(--primary))" strokeWidth={2} name={language === 'th' ? 'จำนวน' : 'Count'} />
                <Line type="monotone" dataKey="avgSatisfaction" stroke="#f59e0b" strokeWidth={2} name={language === 'th' ? 'ความพึงพอใจ' : 'Satisfaction'} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel */}
        <Card>
          <CardHeader><CardTitle className="text-sm">{language === 'th' ? 'ตามช่องทาง' : 'By Channel'}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Knowledge */}
        <Card>
          <CardHeader><CardTitle className="text-sm">{language === 'th' ? 'คะแนนความรู้เฉลี่ย (จาก 3)' : 'Avg Knowledge Score (/3)'}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={knowledgeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 3]} />
                <YAxis dataKey="name" type="category" width={50} />
                <Tooltip />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Services pie */}
        <Card>
          <CardHeader><CardTitle className="text-sm">{language === 'th' ? 'บริการที่ได้รับ' : 'Services Received'}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'STI', value: rows.filter(r => r.received_sti).length },
                    { name: 'PrEP', value: rows.filter(r => r.received_prep).length },
                    { name: 'PEP', value: rows.filter(r => r.received_pep).length },
                    { name: 'ART', value: rows.filter(r => r.received_art).length },
                    { name: 'HR', value: rows.filter(r => r.received_harm_reduction).length },
                    { name: 'MH', value: rows.filter(r => r.received_mental_health).length },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                >
                  {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Response Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{language === 'th' ? 'รายการตอบแบบประเมิน' : 'Response List'}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">{language === 'th' ? 'วันที่' : 'Date'}</th>
                  <th className="text-left py-2 px-2">{language === 'th' ? 'ช่องทาง' : 'Channel'}</th>
                  <th className="text-center py-2 px-2">{language === 'th' ? 'คุณภาพ' : 'Quality'}</th>
                  <th className="text-center py-2 px-2">{language === 'th' ? 'พึงพอใจ' : 'Sat.'}</th>
                  <th className="text-center py-2 px-2">{language === 'th' ? 'มั่นใจ' : 'Eff.'}</th>
                  <th className="text-left py-2 px-2">{language === 'th' ? 'ข้อเสนอแนะ' : 'Feedback'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2 font-mono">{r.unique_id}</td>
                    <td className="py-2 px-2">{r.service_date}</td>
                    <td className="py-2 px-2">{r.channel}</td>
                    <td className="py-2 px-2 text-center">{r.counselling_quality_percent != null ? `${r.counselling_quality_percent}%` : '-'}</td>
                    <td className="py-2 px-2 text-center">{r.satisfaction_score ?? '-'}</td>
                    <td className="py-2 px-2 text-center">{r.self_efficacy_score ?? '-'}</td>
                    <td className="py-2 px-2 max-w-[200px] truncate">{r.open_feedback_text || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && <p className="text-xs text-muted-foreground mt-2 text-center">Showing 50 of {rows.length}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center text-center gap-1">
        <div className="text-primary">{icon}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
