import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
  language: string;
}

interface MonthRecord {
  month_key: string;
  total_points: number;
  rank: number | null;
  is_eligible: boolean;
  entries: number;
}

function getMonthLabel(monthKey: string, lang: string) {
  const [y, m] = monthKey.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'short', year: 'numeric' });
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthlyHistoryCard({ userId, language }: Props) {
  const [history, setHistory] = useState<MonthRecord[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentMonth = getCurrentMonthKey();

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reward_points_monthly')
      .select('month_key, total_points, rank, is_eligible, entries')
      .eq('user_id', userId)
      .neq('month_key', currentMonth)
      .order('month_key', { ascending: false })
      .limit(12);

    if (data) setHistory(data as MonthRecord[]);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="animate-pulse space-y-2">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-center">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            {language === 'th' ? 'ยังไม่มีประวัติเดือนก่อนหน้า' : 'No previous month history yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const visible = expanded ? history : history.slice(0, 3);

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {language === 'th' ? 'ประวัติรายเดือน' : 'Monthly History'}
        </h3>

        <div className="space-y-2">
          {visible.map((m) => (
            <div key={m.month_key} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium">{getMonthLabel(m.month_key, language)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {m.total_points.toLocaleString()} {language === 'th' ? 'คะแนน' : 'pts'}
                  {m.rank && ` • #${m.rank}`}
                </p>
              </div>
              <Badge variant={m.is_eligible ? "default" : "secondary"} className="text-[10px]">
                {m.is_eligible
                  ? (language === 'th' ? 'ร่วมลุ้น' : 'Entered')
                  : (language === 'th' ? 'ไม่ถึงเกณฑ์' : 'Not eligible')}
              </Badge>
            </div>
          ))}
        </div>

        {history.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? (language === 'th' ? 'แสดงน้อยลง' : 'Show less')
              : (language === 'th' ? 'ดูทั้งหมด' : 'Show all')}
            {expanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
