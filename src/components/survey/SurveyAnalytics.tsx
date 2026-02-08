import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, BarChart3, Users, FileText, Loader2, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import type { SurveyQuestion, SurveyResponse, SurveyAnswer, QuestionOption } from "./types";

interface SurveyAnalyticsProps {
  surveyId: string;
  questions: SurveyQuestion[];
}

interface AnswerStats {
  question_id: string;
  question_text: string;
  question_type: string;
  options: { label: string; count: number; percentage: number }[];
  text_responses?: string[];
  rating_average?: number;
  rating_distribution?: { rating: number; count: number }[];
  total_responses: number;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--xp))',
  'hsl(var(--destructive))',
  '#6366f1',
  '#14b8a6',
  '#f97316',
];

export function SurveyAnalytics({ surveyId, questions }: SurveyAnalyticsProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [stats, setStats] = useState<AnswerStats[]>([]);

  useEffect(() => {
    fetchData();
  }, [surveyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);

      // Fetch all answers for this survey's responses
      const responseIds = (responsesData || []).map((r) => r.id);
      if (responseIds.length > 0) {
        const { data: answersData, error: answersError } = await supabase
          .from('survey_answers')
          .select('*')
          .in('response_id', responseIds);

        if (answersError) throw answersError;
        setAnswers(answersData || []);

        // Calculate stats
        calculateStats(answersData || [], responsesData || []);
      } else {
        setAnswers([]);
        setStats([]);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (answersData: SurveyAnswer[], responsesData: SurveyResponse[]) => {
    const statsMap: AnswerStats[] = questions.map((q) => {
      const questionAnswers = answersData.filter((a) => a.question_id === q.id);
      const questionText = language === 'th' ? q.question_text_th : q.question_text_en;

      if (q.question_type === 'multiple_choice' || q.question_type === 'checkbox') {
        const optionCounts: Record<string, number> = {};
        q.options.forEach((opt) => {
          optionCounts[opt.id] = 0;
        });

        questionAnswers.forEach((a) => {
          const selectedOptions = a.answer_options as string[] || [];
          selectedOptions.forEach((optId) => {
            if (optionCounts[optId] !== undefined) {
              optionCounts[optId]++;
            }
          });
        });

        const totalResponses = questionAnswers.length;
        const options = q.options.map((opt) => ({
          label: language === 'th' ? opt.text_th : opt.text_en,
          count: optionCounts[opt.id] || 0,
          percentage: totalResponses > 0 ? Math.round((optionCounts[opt.id] / totalResponses) * 100) : 0,
        }));

        return {
          question_id: q.id,
          question_text: questionText,
          question_type: q.question_type,
          options,
          total_responses: totalResponses,
        };
      } else if (q.question_type === 'rating') {
        const ratings = questionAnswers.map((a) => a.answer_rating).filter((r) => r !== null) as number[];
        const average = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

        const distribution: Record<number, number> = {};
        for (let i = q.rating_min; i <= q.rating_max; i++) {
          distribution[i] = 0;
        }
        ratings.forEach((r) => {
          if (distribution[r] !== undefined) distribution[r]++;
        });

        return {
          question_id: q.id,
          question_text: questionText,
          question_type: q.question_type,
          options: [],
          rating_average: Math.round(average * 10) / 10,
          rating_distribution: Object.entries(distribution).map(([rating, count]) => ({
            rating: parseInt(rating),
            count,
          })),
          total_responses: ratings.length,
        };
      } else {
        const textResponses = questionAnswers
          .map((a) => a.answer_text)
          .filter((t) => t && t.trim().length > 0) as string[];

        return {
          question_id: q.id,
          question_text: questionText,
          question_type: q.question_type,
          options: [],
          text_responses: textResponses,
          total_responses: textResponses.length,
        };
      }
    });

    setStats(statsMap);
  };

  const exportToCSV = () => {
    // Build CSV header
    const headers = ['Response ID', 'Date', 'Anonymous', ...questions.map((q) => (language === 'th' ? q.question_text_th : q.question_text_en))];

    // Build rows
    const rows = responses.map((response) => {
      const responseAnswers = answers.filter((a) => a.response_id === response.id);
      const row = [
        response.id.substring(0, 8),
        format(new Date(response.created_at), 'yyyy-MM-dd HH:mm'),
        response.is_anonymous ? 'Yes' : 'No',
      ];

      questions.forEach((q) => {
        const answer = responseAnswers.find((a) => a.question_id === q.id);
        if (!answer) {
          row.push('');
        } else if (q.question_type === 'rating') {
          row.push(answer.answer_rating?.toString() || '');
        } else if (q.question_type === 'multiple_choice' || q.question_type === 'checkbox') {
          const selectedOptions = answer.answer_options as string[] || [];
          const optionTexts = selectedOptions.map((optId) => {
            const opt = q.options.find((o) => o.id === optId);
            return opt ? (language === 'th' ? opt.text_th : opt.text_en) : '';
          });
          row.push(optionTexts.join('; '));
        } else {
          row.push(answer.answer_text || '');
        }
      });

      return row;
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-${surveyId.substring(0, 8)}-responses.csv`;
    link.click();
  };

  const dateLocale = language === 'th' ? th : enUS;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'th' ? 'ผู้ตอบทั้งหมด' : 'Total Responses'}
              </p>
              <p className="text-2xl font-bold">{responses.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'th' ? 'คำถามทั้งหมด' : 'Questions'}
              </p>
              <p className="text-2xl font-bold">{questions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'th' ? 'ไม่ระบุตัวตน' : 'Anonymous'}
              </p>
              <p className="text-2xl font-bold">
                {responses.filter((r) => r.is_anonymous).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <Button variant="outline" className="w-full h-full" onClick={exportToCSV}>
            <Download className="h-5 w-5 mr-2" />
            {language === 'th' ? 'Export CSV' : 'Export CSV'}
          </Button>
        </Card>
      </div>

      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {language === 'th' ? 'รีเฟรช' : 'Refresh'}
        </Button>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">
            {language === 'th' ? '📊 สรุปผล' : '📊 Summary'}
          </TabsTrigger>
          <TabsTrigger value="responses">
            {language === 'th' ? '📝 คำตอบรายบุคคล' : '📝 Individual Responses'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6 mt-4">
          {stats.map((stat, index) => (
            <Card key={stat.question_id} className="p-4">
              <h3 className="font-semibold mb-4">
                {index + 1}. {stat.question_text}
              </h3>

              {(stat.question_type === 'multiple_choice' || stat.question_type === 'checkbox') && stat.options.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stat.options}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ label, percentage }) => `${percentage}%`}
                        >
                          {stat.options.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {stat.options.map((opt, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="text-sm">{opt.label}</span>
                        <span className="text-sm font-medium">{opt.count} ({opt.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stat.question_type === 'rating' && stat.rating_distribution && (
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="text-3xl font-bold text-primary">{stat.rating_average}</span>
                    <span className="text-muted-foreground ml-1">
                      {language === 'th' ? 'คะแนนเฉลี่ย' : 'Average'}
                    </span>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stat.rating_distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rating" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {(stat.question_type === 'text_short' || stat.question_type === 'text_long') && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {stat.text_responses && stat.text_responses.length > 0 ? (
                    stat.text_responses.map((text, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded text-sm">
                        {text}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {language === 'th' ? 'ยังไม่มีคำตอบ' : 'No responses yet'}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-4">
                {language === 'th' ? `${stat.total_responses} คำตอบ` : `${stat.total_responses} responses`}
              </p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="responses" className="mt-4">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'th' ? 'วันที่' : 'Date'}</TableHead>
                  <TableHead>{language === 'th' ? 'สถานะ' : 'Status'}</TableHead>
                  {questions.slice(0, 3).map((q, i) => (
                    <TableHead key={q.id} className="max-w-[150px] truncate">
                      Q{i + 1}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {language === 'th' ? 'ยังไม่มีคำตอบ' : 'No responses yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  responses.slice(0, 20).map((response) => {
                    const responseAnswers = answers.filter((a) => a.response_id === response.id);
                    return (
                      <TableRow key={response.id}>
                        <TableCell>
                          {format(new Date(response.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${response.is_anonymous ? 'bg-muted' : 'bg-primary/10 text-primary'}`}>
                            {response.is_anonymous 
                              ? (language === 'th' ? 'ไม่ระบุตัวตน' : 'Anonymous')
                              : (language === 'th' ? 'ระบุตัวตน' : 'Identified')}
                          </span>
                        </TableCell>
                        {questions.slice(0, 3).map((q) => {
                          const answer = responseAnswers.find((a) => a.question_id === q.id);
                          let displayValue = '-';
                          if (answer) {
                            if (q.question_type === 'rating') {
                              displayValue = answer.answer_rating?.toString() || '-';
                            } else if (q.question_type === 'multiple_choice' || q.question_type === 'checkbox') {
                              const opts = answer.answer_options as string[] || [];
                              displayValue = opts.length > 0 ? `${opts.length} selected` : '-';
                            } else {
                              displayValue = answer.answer_text?.substring(0, 30) || '-';
                            }
                          }
                          return (
                            <TableCell key={q.id} className="max-w-[150px] truncate">
                              {displayValue}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
