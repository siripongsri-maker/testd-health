import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Loader2, Users, BarChart3, CheckCircle, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { exportToCsv, formatCsvDate, type CsvColumn } from "@/lib/adminCsvExport";

const COLORS = ['hsl(var(--primary))', '#5DCAA5', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#EF4444', '#10B981', '#6366F1'];

interface YouthResponse {
  id: string;
  consent: string;
  role: string | null;
  age_group: string | null;
  region: string | null;
  gender_identities: string[] | null;
  knowledge_level: string | null;
  prevention_methods: string[] | null;
  tested_12m: string | null;
  barriers: string[] | null;
  school_hiv: string | null;
  comfort_talking: string | null;
  taught_hiv: string | null;
  teach_barriers: string[] | null;
  platforms: string[] | null;
  use_ai_interest: string | null;
  stigma_avoidance: string | null;
  open_feedback: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  student_in: 'นักเรียน/นักศึกษาในระบบ', student_out: 'เยาวชนนอกระบบ',
  vocational: 'นักเรียนอาชีวะ', teacher: 'ครู/อาจารย์',
  volunteer: 'อาสาสมัคร', other: 'อื่นๆ',
};
const AGE_LABELS: Record<string, string> = { u18: '< 18', '18-24': '18–24', '25-29': '25–29', '30plus': '30+' };
const REGION_LABELS: Record<string, string> = { bkk: 'กทม.', central: 'ภาคกลาง', north: 'ภาคเหนือ', northeast: 'อีสาน', south: 'ภาคใต้', no_say: 'ไม่ระบุ' };
const KNOWLEDGE_LABELS: Record<string, string> = { very: 'รู้ดีมาก', some: 'พอสมควร', little: 'น้อยมาก', none: 'ไม่รู้เลย' };
const TESTED_LABELS: Record<string, string> = { yes: 'ตรวจแล้ว', no: 'ไม่เคย', unsure: 'ไม่แน่ใจ' };
const STIGMA_LABELS: Record<string, string> = { yes: 'เคย', no: 'ไม่เคย', unsure: 'ไม่แน่ใจ' };
const AI_LABELS: Record<string, string> = { yes: 'อยากลองมาก!', maybe: 'อาจจะ', human: 'คุยกับคนจริง', no: 'ไม่สนใจ' };

function countField(data: YouthResponse[], field: keyof YouthResponse, labels: Record<string, string>) {
  const counts: Record<string, number> = {};
  data.forEach(r => {
    const v = r[field] as string | null;
    if (v && labels[v]) counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(labels).map(([key, name]) => ({ name, value: counts[key] || 0 })).filter(d => d.value > 0);
}

function countArrayField(data: YouthResponse[], field: keyof YouthResponse) {
  const counts: Record<string, number> = {};
  data.forEach(r => {
    const arr = r[field] as string[] | null;
    if (arr) arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
}

export default function AdminYouthSurveyContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [data, setData] = useState<YouthResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: rows } = await (supabase as any)
      .from('youth_hiv_survey_responses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (rows) setData(rows);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const csvCols: CsvColumn<YouthResponse>[] = [
    { key: 'created_at', header: 'Date', format: r => formatCsvDate(r.created_at) },
    { key: 'role', header: 'Role' },
    { key: 'age_group', header: 'Age' },
    { key: 'region', header: 'Region' },
    { key: 'gender_identities', header: 'Gender', format: r => (r.gender_identities || []).join('; ') },
    { key: 'knowledge_level', header: 'Knowledge' },
    { key: 'prevention_methods', header: 'Prevention', format: r => (r.prevention_methods || []).join('; ') },
    { key: 'tested_12m', header: 'Tested 12m' },
    { key: 'barriers', header: 'Barriers', format: r => (r.barriers || []).join('; ') },
    { key: 'platforms', header: 'Platforms', format: r => (r.platforms || []).join('; ') },
    { key: 'use_ai_interest', header: 'AI Interest' },
    { key: 'stigma_avoidance', header: 'Stigma' },
    { key: 'open_feedback', header: 'Open Feedback' },
  ];

  const consentedData = data.filter(d => d.consent === 'yes');
  const testedYes = consentedData.filter(d => d.tested_12m === 'yes').length;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{isTh ? 'แบบสำรวจเยาวชน HIV' : 'Youth HIV Survey'}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={() => exportToCsv(data, csvCols, 'youth_hiv_survey')} className="gap-1">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isTh ? 'ผู้ตอบทั้งหมด' : 'Total Responses', value: data.length, icon: Users, color: 'text-primary' },
          { label: isTh ? 'ยินยอมเข้าร่วม' : 'Consented', value: consentedData.length, icon: CheckCircle, color: 'text-emerald-600' },
          { label: isTh ? 'เคยตรวจ HIV' : 'Tested HIV', value: testedYes, icon: BarChart3, color: 'text-blue-600' },
          { label: isTh ? 'ภูมิภาค' : 'Regions', value: new Set(consentedData.map(d => d.region).filter(Boolean)).size, icon: MapPin, color: 'text-amber-600' },
        ].map((kpi, i) => (
          <Card key={i} className="border border-border/50">
            <CardContent className="p-3 text-center">
              <kpi.icon className={`h-4 w-4 mx-auto mb-1 ${kpi.color}`} />
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1: Role + Age */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title={isTh ? 'บทบาท' : 'Role'}>
          <SimpleBarChart data={countField(consentedData, 'role', ROLE_LABELS)} />
        </ChartCard>
        <ChartCard title={isTh ? 'กลุ่มอายุ' : 'Age Group'}>
          <SimplePieChart data={countField(consentedData, 'age_group', AGE_LABELS)} />
        </ChartCard>
      </div>

      {/* Charts Row 2: Region + Knowledge */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title={isTh ? 'ภูมิภาค' : 'Region'}>
          <SimpleBarChart data={countField(consentedData, 'region', REGION_LABELS)} />
        </ChartCard>
        <ChartCard title={isTh ? 'ระดับความรู้ HIV' : 'HIV Knowledge Level'}>
          <SimplePieChart data={countField(consentedData, 'knowledge_level', KNOWLEDGE_LABELS)} />
        </ChartCard>
      </div>

      {/* Charts Row 3: Testing + Stigma */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title={isTh ? 'เคยตรวจ HIV (12 เดือน)' : 'Tested HIV (12 months)'}>
          <SimplePieChart data={countField(consentedData, 'tested_12m', TESTED_LABELS)} />
        </ChartCard>
        <ChartCard title={isTh ? 'หลีกเลี่ยงบริการเพราะ Stigma' : 'Avoided Services Due to Stigma'}>
          <SimplePieChart data={countField(consentedData, 'stigma_avoidance', STIGMA_LABELS)} />
        </ChartCard>
      </div>

      {/* Charts Row 4: Platforms + AI Interest */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title={isTh ? 'แพลตฟอร์มที่ใช้' : 'Platforms Used'}>
          <SimpleBarChart data={countArrayField(consentedData, 'platforms')} />
        </ChartCard>
        <ChartCard title={isTh ? 'ความสนใจ AI/Chatbot' : 'AI/Chatbot Interest'}>
          <SimplePieChart data={countField(consentedData, 'use_ai_interest', AI_LABELS)} />
        </ChartCard>
      </div>

      {/* Prevention methods + Barriers */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title={isTh ? 'วิธีป้องกันที่รู้จัก' : 'Known Prevention Methods'}>
          <SimpleBarChart data={countArrayField(consentedData, 'prevention_methods')} />
        </ChartCard>
        <ChartCard title={isTh ? 'อุปสรรคการตรวจ' : 'Testing Barriers'}>
          <SimpleBarChart data={countArrayField(consentedData.filter(d => d.tested_12m === 'no'), 'barriers')} />
        </ChartCard>
      </div>

      {/* Open feedback */}
      {consentedData.some(d => d.open_feedback) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isTh ? 'ข้อเสนอแนะ (Open Feedback)' : 'Open Feedback'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-auto">
            {consentedData.filter(d => d.open_feedback).map(d => (
              <div key={d.id} className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                "{d.open_feedback}"
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="h-48">{children}</CardContent>
    </Card>
  );
}

function SimpleBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
        <Tooltip />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SimplePieChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
